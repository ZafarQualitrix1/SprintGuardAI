import { z } from 'zod';

export const recordExecutionSchema = z.object({
  status: z.enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']),
  notes: z.string().optional(),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
});
export type RecordExecutionInput = z.infer<typeof recordExecutionSchema>;

export interface Execution {
  id: string;
  testCaseId: string;
  testCaseTitle: string;
  status: string;
  executedBy: string | null;
  executedAt: string | null;
  notes: string | null;
  evidenceUrl: string | null;
}
