import { Injectable } from '@nestjs/common';
import { Prisma, PrismaService } from '@sprintguard/database';

export interface NotifyInput {
  organizationId: string;
  userId: string;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

// First real writer of the NotificationEvent model (previously schema-only, unused everywhere in
// this codebase). v1 scope: IN_APP channel only -- SLACK/TEAMS/EMAIL values exist on the
// NotificationChannel enum but nothing actually delivers to them yet, same kind of honest
// partial-implementation documented elsewhere (e.g. prompt-management's FETCH_CAP).
@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async notify(input: NotifyInput): Promise<void> {
    await this.prisma.notificationEvent.create({
      data: {
        organizationId: input.organizationId,
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        payload: input.payload as Prisma.InputJsonValue | undefined,
        channel: 'IN_APP',
        sentAt: new Date(),
      },
    });
  }

  async notifyMany(userIds: string[], input: Omit<NotifyInput, 'userId'>): Promise<void> {
    await Promise.all(userIds.map((userId) => this.notify({ ...input, userId })));
  }

  /** All users in the org holding a given role key (e.g. 'PRODUCT_MANAGER'), for role-based broadcast. */
  async findUserIdsByRoleKey(organizationId: string, roleKey: string): Promise<string[]> {
    const memberships = await this.prisma.membership.findMany({
      where: { organizationId, role: { key: roleKey } },
      select: { userId: true },
    });
    return memberships.map((m) => m.userId);
  }
}
