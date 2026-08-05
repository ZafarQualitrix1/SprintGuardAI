'use client';

import { useQuery } from '@tanstack/react-query';
import { automationExecutionApi } from './automation-execution.api';

// Polling, not websockets/SSE: this Vercel-serverless API can't hold a long-lived connection open,
// so "live" progress means the frontend refetches on an interval while a run is still in flight
// (see GithubActionsService's module doc for the full rationale) and stops once it reaches a
// terminal status.
const ACTIVE_STATUSES = new Set(['QUEUED', 'RUNNING']);
const POLL_INTERVAL_MS = 4000;

export function useAutomationExecutionRun(runId: string | null) {
  return useQuery({
    queryKey: ['automation-execution', 'detail', runId],
    queryFn: () => automationExecutionApi.get(runId as string),
    enabled: Boolean(runId),
    refetchInterval: (query) => (query.state.data && ACTIVE_STATUSES.has(query.state.data.status) ? POLL_INTERVAL_MS : false),
  });
}
