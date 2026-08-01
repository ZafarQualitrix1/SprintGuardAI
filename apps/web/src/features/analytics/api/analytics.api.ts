import type { DashboardSummary } from './dashboard-summary.types';
import { apiClient } from '@/lib/api-client';

export const analyticsApi = {
  getDashboardSummary: () => apiClient.get<DashboardSummary>('/dashboard/summary'),
};
