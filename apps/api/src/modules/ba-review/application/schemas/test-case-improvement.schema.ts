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

const testCaseFieldsSchema = z.object({
  title: z.string().min(1),
  steps: z.array(z.object({ step: z.string().min(1), expected: z.string().min(1) })).min(1),
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
  // Enterprise Test Generation fields -- kept in lockstep with test-generation.schema.ts's
  // testCaseOutputSchema.
  testObjective: z.string().min(1).nullable().default(null),
  preconditions: z.array(z.string().min(1)).nullable().default(null),
  dependencies: z.string().min(1).nullable().default(null),
  requestMethod: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).nullable().default(null),
  requestPayload: z.record(z.unknown()).nullable().default(null),
  expectedStatusCode: z.number().int().nullable().default(null),
  expectedResponse: z.string().min(1).nullable().default(null),
  remarks: z.string().min(1).nullable().default(null),
});

// Output of the `test-case-improvement` capability -- takes the BA's feedback plus the existing
// test-case baseline and returns a targeted changeset (not a full regeneration), so
// ITestCaseRepository.applyChangeset can preserve every test case the AI didn't flag as needing a
// change, per the spec's "regenerate only necessary changes while preserving all previously
// correct test cases."
export const testCaseImprovementOutputSchema = z.object({
  added: z
    .array(testCaseFieldsSchema.extend({ scenarioId: z.string().min(1), addReason: z.string().min(1) }))
    .default([]),
  modified: z.array(testCaseFieldsSchema.extend({ id: z.string().min(1), changeReason: z.string().min(1) })).default([]),
  removed: z.array(z.object({ id: z.string().min(1), reason: z.string().min(1) })).default([]),
  improvementSummary: z.object({
    feedbackSummary: z.string().min(1),
    coverageImpact: z.string().min(1),
    automationReadinessImpact: z.string().min(1),
    traceabilityImpact: z.string().min(1),
  }),
});
export type TestCaseImprovementOutput = z.infer<typeof testCaseImprovementOutputSchema>;
