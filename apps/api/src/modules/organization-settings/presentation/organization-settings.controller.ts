import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CurrentUser, AuthenticatedUser } from '../../../common/decorators/current-user.decorator';
import { RequirePermission } from '../../../common/decorators/require-permission.decorator';
import { GetOrganizationSettingsQuery } from '../application/queries/get-organization-settings.query';
import {
  ExportOrganizationSettingsQuery,
  OrganizationSettingsBackup,
} from '../application/queries/export-organization-settings.query';
import { ListInvitationsQuery } from '../application/queries/list-invitations.query';
import { ListOrganizationMembersQuery } from '../application/queries/list-organization-members.query';
import { GetOrganizationBrandingQuery, OrganizationBranding } from '../application/queries/get-organization-branding.query';
import { UpsertOrganizationSettingsCommand } from '../application/commands/upsert-organization-settings.command';
import { UploadOrganizationLogoCommand } from '../application/commands/upload-organization-logo.command';
import { ImportOrganizationSettingsCommand } from '../application/commands/import-organization-settings.command';
import { SendTestNotificationCommand, SendTestNotificationResult } from '../application/commands/send-test-notification.command';
import { InviteMemberCommand, InviteMemberResult } from '../application/commands/invite-member.command';
import { RevokeInvitationCommand } from '../application/commands/revoke-invitation.command';
import { ChangeMemberRoleCommand } from '../application/commands/change-member-role.command';
import { RemoveMemberCommand } from '../application/commands/remove-member.command';
import { OrganizationSettingsRecord } from '../domain/repositories/organization-settings.repository.interface';
import { InvitationRecord } from '../domain/repositories/invitation.repository.interface';
import { OrganizationMemberRecord } from '../domain/repositories/organization-member.repository.interface';
import {
  ChangeMemberRoleDto,
  UploadOrganizationLogoDto,
  ImportOrganizationSettingsDto,
  InviteMemberDto,
  UpsertOrganizationSettingsDto,
} from './dto';

// Presentation layer: HTTP entrypoints only. Delegates to Application-layer command/query
// handlers -- never touches Domain or Infrastructure directly. Backs the Organization Settings
// page's Profile/Workspace/Jira/Notifications/Team/Security/Automation/AI/Backup sections.
// Member-management routes additionally require `member:manage`; everything else requires the
// broader `org:manage`.
@ApiTags('OrganizationSettings')
@Controller('organization-settings')
export class OrganizationSettingsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get('branding')
  @RequirePermission('org:manage')
  async getBranding(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationBranding> {
    return this.queryBus.execute(new GetOrganizationBrandingQuery(user.organizationId));
  }

  @Get()
  @RequirePermission('org:manage')
  async get(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationSettingsRecord> {
    return this.queryBus.execute(new GetOrganizationSettingsQuery(user.organizationId));
  }

  @Patch()
  @RequirePermission('org:manage')
  async upsert(
    @Body() dto: UpsertOrganizationSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationSettingsRecord> {
    return this.commandBus.execute(new UpsertOrganizationSettingsCommand(user.organizationId, user.userId, dto));
  }

  @Get('export')
  @RequirePermission('org:manage')
  async export(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationSettingsBackup> {
    return this.queryBus.execute(new ExportOrganizationSettingsQuery(user.organizationId));
  }

  @Post('import')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async import(
    @Body() dto: ImportOrganizationSettingsDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationSettingsRecord> {
    return this.commandBus.execute(new ImportOrganizationSettingsCommand(user.organizationId, user.userId, dto));
  }

  @Post('logo')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async uploadLogo(
    @Body() dto: UploadOrganizationLogoDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<{ logoUrl: string }> {
    return this.commandBus.execute(
      new UploadOrganizationLogoCommand(user.organizationId, user.userId, dto.contentType, dto.data),
    );
  }

  @Post('notifications/test/:channel')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('org:manage')
  async sendTestNotification(
    @Param('channel') channel: 'slack' | 'teams',
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SendTestNotificationResult> {
    return this.commandBus.execute(new SendTestNotificationCommand(user.organizationId, channel));
  }

  @Get('members')
  @RequirePermission('org:manage')
  async listMembers(@CurrentUser() user: AuthenticatedUser): Promise<OrganizationMemberRecord[]> {
    return this.queryBus.execute(new ListOrganizationMembersQuery(user.organizationId));
  }

  @Patch('members/:userId/role')
  @RequirePermission('member:manage')
  async changeMemberRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeMemberRoleDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrganizationMemberRecord> {
    return this.commandBus.execute(
      new ChangeMemberRoleCommand(user.organizationId, user.userId, userId, dto.roleKey),
    );
  }

  @Delete('members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member:manage')
  async removeMember(@Param('userId') userId: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new RemoveMemberCommand(user.organizationId, user.userId, userId));
  }

  @Get('invitations')
  @RequirePermission('member:manage')
  async listInvitations(@CurrentUser() user: AuthenticatedUser): Promise<InvitationRecord[]> {
    return this.queryBus.execute(new ListInvitationsQuery(user.organizationId));
  }

  @Post('invitations')
  @RequirePermission('member:manage')
  async invite(@Body() dto: InviteMemberDto, @CurrentUser() user: AuthenticatedUser): Promise<InviteMemberResult> {
    return this.commandBus.execute(new InviteMemberCommand(user.organizationId, user.userId, dto.email, dto.roleKey));
  }

  @Delete('invitations/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @RequirePermission('member:manage')
  async revokeInvitation(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser): Promise<void> {
    await this.commandBus.execute(new RevokeInvitationCommand(user.organizationId, user.userId, id));
  }
}
