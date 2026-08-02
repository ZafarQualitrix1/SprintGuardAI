import { apiClient } from '@/lib/api-client';
import type { BaReviewCycle, BaReviewStatusSummary, BaReviewSyncLog } from '../types';

export const baReviewApi = {
  getStatus: (storyId: string) => apiClient.get<BaReviewStatusSummary>(`/stories/${storyId}/ba-review`),
  getTimeline: (storyId: string) => apiClient.get<BaReviewCycle[]>(`/stories/${storyId}/ba-review/timeline`),
  getSyncLogs: (storyId: string) => apiClient.get<BaReviewSyncLog[]>(`/stories/${storyId}/ba-review/sync-logs`),
  approve: (storyId: string, approvalComment: string) =>
    apiClient.post<BaReviewCycle>(`/stories/${storyId}/ba-review/approve`, { approvalComment }),
  requestChanges: (storyId: string, feedbackText: string) =>
    apiClient.post<{ accepted: true }>(`/stories/${storyId}/ba-review/request-changes`, { feedbackText }),
  adminUnlock: (storyId: string, reason: string) =>
    apiClient.post<{ unlocked: true }>(`/stories/${storyId}/ba-review/admin-unlock`, { reason }),
  updateAssignment: (storyId: string, assignedBaEmail: string | null) =>
    apiClient.patch<{ updated: true }>(`/stories/${storyId}/ba-review/assignment`, { assignedBaEmail }),
  syncNow: (storyId: string) =>
    apiClient.post<{ storiesChecked: number; repliesFound: number }>(`/stories/${storyId}/ba-review/sync-now`),
};
