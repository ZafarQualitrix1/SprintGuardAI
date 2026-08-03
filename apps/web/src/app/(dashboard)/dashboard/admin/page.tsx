'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AgentsPanel } from '@/features/ai-settings/components';
import {
  AuditLogsPanel,
  BackgroundJobsPanel,
  DashboardOverview,
  FeatureFlagsPanel,
  IntegrationsPanel,
  PromptApprovalsWidget,
  RolesPermissionsPanel,
  SystemMonitoringPanel,
  UsersPanel,
} from '@/features/admin/components';

// Admin Console -- the central control center for SprintGuard AI, gated to Super Admins and
// Organization Admins server-side (org:manage/admin:platform). Reuses the AI Settings module's
// Agents panel directly rather than duplicating agent enable/disable/stats.
export default function Page() {
  return (
    <div>
      <PageHeader title="Admin" description="Platform-wide administration." />
      <Tabs defaultValue="dashboard">
        <TabsList className="flex-wrap">
          <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="agents">AI Agents</TabsTrigger>
          <TabsTrigger value="monitoring">System Monitoring</TabsTrigger>
          <TabsTrigger value="audit">Audit Logs</TabsTrigger>
          <TabsTrigger value="jobs">Background Jobs</TabsTrigger>
          <TabsTrigger value="flags">Feature Flags</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="prompts">Prompt Approvals</TabsTrigger>
        </TabsList>
        <TabsContent value="dashboard">
          <DashboardOverview />
        </TabsContent>
        <TabsContent value="users">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="roles">
          <RolesPermissionsPanel />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsPanel />
        </TabsContent>
        <TabsContent value="monitoring">
          <SystemMonitoringPanel />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogsPanel />
        </TabsContent>
        <TabsContent value="jobs">
          <BackgroundJobsPanel />
        </TabsContent>
        <TabsContent value="flags">
          <FeatureFlagsPanel />
        </TabsContent>
        <TabsContent value="integrations">
          <IntegrationsPanel />
        </TabsContent>
        <TabsContent value="prompts">
          <PromptApprovalsWidget />
        </TabsContent>
      </Tabs>
    </div>
  );
}
