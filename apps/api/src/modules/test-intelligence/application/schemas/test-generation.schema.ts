import { z } from 'zod';

const prioritySchema = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
const testTypeSchema = z.enum([
  'FUNCTIONAL',
  'NEGATIVE',
  'BOUNDARY',
  'VALIDATION',
  'BUSINESS_RULE',
  'API',
  'UI',
  'SECURITY',
  'PERFORMANCE',
  'ACCESSIBILITY',
  'DATABASE',
  'INTEGRATION',
  'REGRESSION',
  'SMOKE',
  'SANITY',
]);
const automationStatusSchema = z.enum(['MANUAL', 'AUTOMATABLE', 'AUTOMATED']);
const automationTypeSchema = z.enum(['NONE', 'API', 'UI']);

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
        description: z.string().min(1).nullable().default(null),
        severity: prioritySchema.default('MEDIUM'),
        module: z.string().min(1).nullable().default(null),
        testType: testTypeSchema.default('FUNCTIONAL'),
        tags: z.array(z.string().min(1)).default([]),
        automationStatus: automationStatusSchema.default('MANUAL'),
        automationType: automationTypeSchema.default('NONE'),
        apiEndpoint: z.string().min(1).nullable().default(null),
        uiScreen: z.string().min(1).nullable().default(null),
      }),
    )
    .min(1),
});
export type TestCaseOutput = z.infer<typeof testCaseOutputSchema>;
