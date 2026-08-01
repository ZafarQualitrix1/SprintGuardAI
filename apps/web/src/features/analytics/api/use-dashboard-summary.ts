'use client';

import { useQuery } from '@tanstack/react-query';
import { analyticsApi } from './analytics.api';

export function useDashboardSummary() {
  return useQuery({
    queryKey: ['analytics', 'dashboard-summary'],
    queryFn: analyticsApi.getDashboardSummary,
  });
}
