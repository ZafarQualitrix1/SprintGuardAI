import { z } from 'zod';

// Mirrors the JSON Schema on the seeded "release-readiness-summary" AiPrompt row
// (packages/database/prisma/seed.ts).
export const releaseSummaryOutputSchema = z.object({
  summary: z.string().min(1),
  highlights: z.array(z.string().min(1)).min(1),
});
export type ReleaseSummaryOutput = z.infer<typeof releaseSummaryOutputSchema>;
