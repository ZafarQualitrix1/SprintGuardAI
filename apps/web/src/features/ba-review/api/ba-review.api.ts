import { apiClient } from '@/lib/api-client';
import type { BaReviewCycle, BaReviewStatusSummary, BaReviewSyncLog, JiraUserMatch } from '../types';

export interface SubmitForReviewInput {
  mentionAccountId: string;
  mentionDisplayName: string;
  ccMentions: { accountId: string; displayName: string }[];
  summary: string;
  comment: string | null;
  attachment: File | null;
}

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
  searchJiraUsers: (storyId: string, q: string) =>
    apiClient.get<JiraUserMatch[]>(`/stories/${storyId}/ba-review/jira-users?q=${encodeURIComponent(q)}`),
  getSubmissionDraft: (storyId: string) =>
    apiClient.get<{ summary: string }>(`/stories/${storyId}/ba-review/submission-draft`),
  submitForReview: (storyId: string, input: SubmitForReviewInput) => {
    const formData = new FormData();
    formData.set('mentionAccountId', input.mentionAccountId);
    formData.set('mentionDisplayName', input.mentionDisplayName);
    formData.set('ccMentions', JSON.stringify(input.ccMentions));
    formData.set('summary', input.summary);
    if (input.comment) formData.set('comment', input.comment);
    if (input.attachment) formData.set('attachment', input.attachment);
    return apiClient.postForm<{ commentId: string; attachmentId: string | null }>(
      `/stories/${storyId}/ba-review/submit`,
      formData,
    );
  },
};
