'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AgentsPanel,
  LogsPanel,
  ModelsPanel,
  ModulesPanel,
  ProvidersPanel,
  UsageCostPanel,
} from '@/features/ai-settings/components';

// AI Settings Control Center -- the central AI control panel every AI-powered feature
// (Requirement Intelligence, Test Generator, Test Coverage, Release Readiness, ...) is actually
// configured through: provider credentials/parameters, model registry + per-module overrides,
// agent enable/disable, and live usage/cost/request logs.
export default function Page() {
  return (
    <div>
      <PageHeader title="AI Settings" description="Provider configuration, model routing, and budgets." />
      <Tabs defaultValue="providers">
        <TabsList>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="models">Models & Modules</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="usage">Usage & Cost</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>
        <TabsContent value="providers">
          <ProvidersPanel />
        </TabsContent>
        <TabsContent value="models" className="space-y-6">
          <ModelsPanel />
          <ModulesPanel />
        </TabsContent>
        <TabsContent value="agents">
          <AgentsPanel />
        </TabsContent>
        <TabsContent value="usage">
          <UsageCostPanel />
        </TabsContent>
        <TabsContent value="logs">
          <LogsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
