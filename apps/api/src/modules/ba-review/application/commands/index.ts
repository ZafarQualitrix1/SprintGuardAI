// Command handlers (CQRS writes) for the BA Review bounded context.
export * from './trigger-ba-review.command';
export * from './sync-ba-review-threads.command';
export * from './process-ba-reply.command';
export * from './regenerate-from-feedback.command';
export * from './approve-review-cycle.command';
export * from './admin-unlock-story.command';
export * from './update-ba-assignment.command';
export * from './submit-for-review.command';

import { TriggerBaReviewHandler } from './trigger-ba-review.command';
import { SyncBaReviewThreadsHandler } from './sync-ba-review-threads.command';
import { ProcessBaReplyHandler } from './process-ba-reply.command';
import { RegenerateFromFeedbackHandler } from './regenerate-from-feedback.command';
import { ApproveReviewCycleHandler } from './approve-review-cycle.command';
import { AdminUnlockStoryHandler } from './admin-unlock-story.command';
import { UpdateBaAssignmentHandler } from './update-ba-assignment.command';
import { SubmitForReviewHandler } from './submit-for-review.command';

export const BA_REVIEW_COMMAND_HANDLERS = [
  TriggerBaReviewHandler,
  SyncBaReviewThreadsHandler,
  ProcessBaReplyHandler,
  RegenerateFromFeedbackHandler,
  ApproveReviewCycleHandler,
  AdminUnlockStoryHandler,
  UpdateBaAssignmentHandler,
  SubmitForReviewHandler,
];
