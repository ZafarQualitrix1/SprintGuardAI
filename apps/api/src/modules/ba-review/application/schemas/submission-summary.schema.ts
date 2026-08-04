import { z } from 'zod';

// Output of the `ba-review-submission-summary` capability -- a short, human-editable draft shown
// in the Submit for Review modal's summary field before the user posts it to Jira.
export const submissionSummaryOutputSchema = z.object({
  summary: z.string().min(1),
});
export type SubmissionSummaryOutput = z.infer<typeof submissionSummaryOutputSchema>;
