'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { baReviewApi, type SubmitForReviewInput } from './ba-review.api';

const statusKey = (storyId: string) => ['ba-review', 'status', storyId];
const timelineKey = (storyId: string) => ['ba-review', 'timeline', storyId];
const syncLogsKey = (storyId: string) => ['ba-review', 'sync-logs', storyId];

export function useBaReviewStatus(storyId: string | null) {
  return useQuery({
    queryKey: statusKey(storyId ?? ''),
    queryFn: () => baReviewApi.getStatus(storyId as string),
    enabled: Boolean(storyId),
  });
}

export function useReviewTimeline(storyId: string) {
  return useQuery({ queryKey: timelineKey(storyId), queryFn: () => baReviewApi.getTimeline(storyId) });
}

export function useBaReviewSyncLogs(storyId: string) {
  return useQuery({ queryKey: syncLogsKey(storyId), queryFn: () => baReviewApi.getSyncLogs(storyId) });
}

// Polled every 30s while the page is open so the mirror keeps pace with new Jira replies without a
// manual refresh -- independent of the 5-minute backend sync cadence (SyncBaReviewThreadsCommand),
// which only needs to run often enough to trigger regeneration promptly, not to drive this UI.
export function useReviewCommentThread(storyId: string) {
  return useQuery({
    queryKey: ['ba-review', 'comments', storyId],
    queryFn: () => baReviewApi.getCommentThread(storyId),
    refetchInterval: 30_000,
  });
}

export function useAuditTrail(storyId: string) {
  return useQuery({
    queryKey: ['ba-review', 'audit-trail', storyId],
    queryFn: () => baReviewApi.getAuditTrail(storyId),
  });
}

function useInvalidateBaReview(storyId: string) {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: statusKey(storyId) });
    queryClient.invalidateQueries({ queryKey: timelineKey(storyId) });
    queryClient.invalidateQueries({ queryKey: syncLogsKey(storyId) });
  };
}

export function useApproveReviewCycle(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: (approvalComment: string) => baReviewApi.approve(storyId, approvalComment),
    onSuccess: invalidate,
  });
}

export function useRequestChanges(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: (feedbackText: string) => baReviewApi.requestChanges(storyId, feedbackText),
    onSuccess: invalidate,
  });
}

export function useAdminUnlock(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: (reason: string) => baReviewApi.adminUnlock(storyId, reason),
    onSuccess: invalidate,
  });
}

export function useUpdateBaAssignment(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: (assignedBaEmail: string | null) => baReviewApi.updateAssignment(storyId, assignedBaEmail),
    onSuccess: invalidate,
  });
}

export function useSyncBaReviewNow(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: () => baReviewApi.syncNow(storyId),
    onSuccess: invalidate,
  });
}

// Debounced by the caller (use-jira-user-search.ts) via `enabled` + a delayed query key, not here.
export function useJiraUserSearch(storyId: string, query: string) {
  return useQuery({
    queryKey: ['ba-review', 'jira-users', storyId, query],
    queryFn: () => baReviewApi.searchJiraUsers(storyId, query),
    enabled: query.trim().length >= 2,
  });
}

export function useSubmissionDraft(storyId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['ba-review', 'submission-draft', storyId],
    queryFn: () => baReviewApi.getSubmissionDraft(storyId),
    enabled,
  });
}

export function useSubmitForReview(storyId: string) {
  const invalidate = useInvalidateBaReview(storyId);
  return useMutation({
    mutationFn: (input: SubmitForReviewInput) => baReviewApi.submitForReview(storyId, input),
    onSuccess: invalidate,
  });
}
