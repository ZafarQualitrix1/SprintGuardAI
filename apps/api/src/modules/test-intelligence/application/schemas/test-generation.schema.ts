import { z } from 'zod';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Mirrors the JSON Schemas on the seeded "test-scenario"/"test-case" AiPrompt rows
// (packages/database/prisma/seed.ts) -- see requirement-intelligence.schema.ts for why Zod here.
export const testScenarioOutputSchema = z.object({
  scenarios: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().min(1),
        priority: prioritySchema,
      }),
    )
    .min(1),
});
export type TestScenarioOutput = z.infer<typeof testScenarioOutputSchema>;

export const testCaseOutputSchema = z.object({
  cases: z
    .array(
      z.object({
        title: z.string().min(1),
        steps: z
          .array(z.object({ step: z.string().min(1), expected: z.string().min(1) }))
          .min(1),
        priority: prioritySchema,
      }),
    )
    .min(1),
});
export type TestCaseOutput = z.infer<typeof testCaseOutputSchema>;
