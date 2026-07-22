'use client';

import { useQuery } from '@tanstack/react-query';
import type { DashboardSummary } from './dashboard-summary.types';

// MOCK -- replaced by a real GET /api/v1/dashboard/summary call once the Sprint Intelligence
// Module (Step 7) and Executive Analytics read models (docs/architecture/02-database-design.md
// §25) exist. Modeled as a real async TanStack Query fetch (with a network-like delay) so the
// page's loading/error states are genuine, not simulated separately -- swapping the queryFn body
// for a real apiClient.get call later requires no change to the page.
async function fetchDashboardSummaryMock(): Promise<DashboardSummary> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    projectsCount: 0,
    activeSprintsCount: 0,
    avgCoveragePercent: null,
    openRisksCount: 0,
    releaseReadinessPercent: null,
    velocityTrend: [],
  };
}

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard-summary'],
    queryFn: fetchDashboardSummaryMock,
  });
}
