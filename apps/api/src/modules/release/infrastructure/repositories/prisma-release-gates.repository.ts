import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';
import {
  IReleaseGatesRepository,
  UpdateSprintGatesInput,
} from '../../domain/repositories/release-gates.repository.interface';

@Injectable()
export class PrismaReleaseGatesRepository implements IReleaseGatesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async updateGates(sprintId: string, organizationId: string, input: UpdateSprintGatesInput) {
    const { count } = await this.prisma.sprint.updateMany({
      where: { id: sprintId, project: { organizationId } },
      data: input,
    });
    if (count === 0) return null;

    const sprint = await this.prisma.sprint.findUnique({
      where: { id: sprintId },
      select: { regressionCompleted: true, deploymentChecklistComplete: true },
    });
    return sprint;
  }
}
