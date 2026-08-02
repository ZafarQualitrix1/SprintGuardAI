'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ExecutionHistory, PromptAnalytics, PromptLibrary, PromptPlayground } from '@/features/prompts/components';

// Prompt Management -- the centralized prompt repository every AI Agent (Requirement
// Intelligence, Deep Requirement Analysis, Coverage, Test Scenario, Test Case, Release Guardian)
// dynamically retrieves its prompt from at execution time (AiOrchestrationService), instead of
// hardcoded prompts. Provider/model routing stays owned by AI Settings; this page owns prompt
// template content, versioning, and the approval workflow.
export default function Page() {
  return (
    <div>
      <PageHeader title="Prompt Management" description="Review, version, and approve AI prompts." />
      <Tabs defaultValue="library">
        <TabsList>
          <TabsTrigger value="library">Library</TabsTrigger>
          <TabsTrigger value="playground">Playground</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="executions">Execution History</TabsTrigger>
        </TabsList>
        <TabsContent value="library" className="mt-4">
          <PromptLibrary />
        </TabsContent>
        <TabsContent value="playground" className="mt-4">
          <PromptPlayground />
        </TabsContent>
        <TabsContent value="analytics" className="mt-4">
          <PromptAnalytics />
        </TabsContent>
        <TabsContent value="executions" className="mt-4">
          <ExecutionHistory />
        </TabsContent>
      </Tabs>
    </div>
  );
}
