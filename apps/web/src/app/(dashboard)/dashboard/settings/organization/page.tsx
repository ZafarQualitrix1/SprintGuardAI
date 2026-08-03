'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AiConfigPanel,
  AutomationPanel,
  BackupPanel,
  JiraPanel,
  NotificationsPanel,
  ProfilePanel,
  SecurityPanel,
  TeamPanel,
  WorkspacePanel,
} from '@/features/organization/components';

// Organization Settings -- the central place an organization manages project-level configuration:
// profile/branding, workspace defaults, Jira import preferences, notification channels, team
// membership/roles, security policy, automation defaults, AI governance toggles, and backup/restore.
export default function Page() {
  return (
    <div>
      <PageHeader title="Organization Settings" description="Manage members, roles, and organization details." />
      <Tabs defaultValue="profile">
        <TabsList className="flex-wrap">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="workspace">Workspace</TabsTrigger>
          <TabsTrigger value="jira">Jira</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="ai">AI</TabsTrigger>
          <TabsTrigger value="backup">Backup</TabsTrigger>
        </TabsList>
        <TabsContent value="profile">
          <ProfilePanel />
        </TabsContent>
        <TabsContent value="workspace">
          <WorkspacePanel />
        </TabsContent>
        <TabsContent value="jira">
          <JiraPanel />
        </TabsContent>
        <TabsContent value="notifications">
          <NotificationsPanel />
        </TabsContent>
        <TabsContent value="team">
          <TeamPanel />
        </TabsContent>
        <TabsContent value="security">
          <SecurityPanel />
        </TabsContent>
        <TabsContent value="automation">
          <AutomationPanel />
        </TabsContent>
        <TabsContent value="ai">
          <AiConfigPanel />
        </TabsContent>
        <TabsContent value="backup">
          <BackupPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
