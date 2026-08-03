import { z } from 'zod';

export const recordExecutionSchema = z.object({
  status: z.enum(['NOT_RUN', 'PASSED', 'FAILED', 'BLOCKED', 'SKIPPED']),
  notes: z.string().optional(),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
  actualResult: z.string().optional(),
  attachmentUrls: z.array(z.string().url()).optional(),
  screenshotUrls: z.array(z.string().url()).optional(),
  defectReference: z.string().optional(),
  executionDurationMs: z.number().int().min(0).optional(),
  testerName: z.string().optional(),
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
  actualResult: string | null;
  attachmentUrls: string[];
  screenshotUrls: string[];
  defectReference: string | null;
  executionDurationMs: number | null;
  testerName: string | null;
}
