'use client';

import { Bot, Bug, Building2, CheckCircle2, FolderKanban, ListChecks, Play, Plug, Rocket, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { SummaryCard } from '@/features/analytics/components/summary-card';
import { useAdminDashboardSummary } from '@/features/admin/api';

export function DashboardOverview() {
  const { data: summary, isLoading } = useAdminDashboardSummary();

  return (
    <div className="space-y-4">
      {summary ? (
        <Badge variant={summary.scope === 'platform' ? 'default' : 'secondary'}>
          {summary.scope === 'platform' ? 'Platform-wide view' : 'This organization'}
        </Badge>
      ) : null}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {summary?.scope === 'platform' ? (
          <SummaryCard
            label="Total Organizations"
            value={(summary.totalOrganizations ?? 0).toLocaleString()}
            icon={Building2}
            isLoading={isLoading}
          />
        ) : null}
        <SummaryCard label="Active Projects" value={(summary?.activeProjects ?? 0).toLocaleString()} icon={FolderKanban} isLoading={isLoading} />
        <SummaryCard label="Active Sprints" value={(summary?.activeSprints ?? 0).toLocaleString()} icon={Rocket} isLoading={isLoading} />
        <SummaryCard label="Connected Jira Projects" value={(summary?.connectedJiraProjects ?? 0).toLocaleString()} icon={Plug} isLoading={isLoading} />
        <SummaryCard label="Total User Stories" value={(summary?.totalUserStories ?? 0).toLocaleString()} icon={ListChecks} isLoading={isLoading} />
        <SummaryCard label="Generated Test Cases" value={(summary?.totalGeneratedTestCases ?? 0).toLocaleString()} icon={CheckCircle2} isLoading={isLoading} />
        <SummaryCard label="Total Executions" value={(summary?.totalExecutions ?? 0).toLocaleString()} icon={Play} isLoading={isLoading} />
        <SummaryCard label="Total Bugs" value={(summary?.totalBugs ?? 0).toLocaleString()} icon={Bug} isLoading={isLoading} />
        <SummaryCard label="Active AI Agents" value={(summary?.activeAiAgents ?? 0).toLocaleString()} icon={Bot} isLoading={isLoading} />
        <SummaryCard label="Total Users" value={(summary?.totalUsers ?? 0).toLocaleString()} icon={Users} isLoading={isLoading} />
      </div>
    </div>
  );
}
