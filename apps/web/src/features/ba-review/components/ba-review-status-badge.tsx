'use client';

import { Badge } from '@/components/ui/badge';
import type { BaReviewStatus } from '../types';

const STATUS_LABEL: Record<BaReviewStatus, string> = {
  PENDING_REVIEW: 'Not submitted',
  AWAITING_APPROVAL: 'Waiting for BA Review',
  FEEDBACK_RECEIVED: 'BA Feedback Received',
  REGENERATION_IN_PROGRESS: 'Regenerating from Feedback',
  APPROVED: 'Approved & Locked',
};

const STATUS_VARIANT: Record<BaReviewStatus, 'secondary' | 'warning' | 'success' | 'outline'> = {
  PENDING_REVIEW: 'outline',
  AWAITING_APPROVAL: 'warning',
  FEEDBACK_RECEIVED: 'warning',
  REGENERATION_IN_PROGRESS: 'warning',
  APPROVED: 'success',
};

// Bug 4: "BA review status should be shown properly" -- a compact, always-visible badge next to
// the story title on the pages people actually work from (Requirement Intelligence, Test
// Generator), not only on the separate BA-review detail page. Shows nothing until a review has
// actually been submitted at least once (reviewCycleCount === 0 means "not submitted yet", which
// the "Not submitted" label under-communicates as noise on every never-reviewed story).
export function BaReviewStatusBadge({
  status,
  reviewCycleCount,
}: {
  status: BaReviewStatus;
  reviewCycleCount: number;
}) {
  if (reviewCycleCount === 0) return null;

  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
