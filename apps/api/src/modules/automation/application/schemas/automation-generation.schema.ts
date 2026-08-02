import { z } from 'zod';

const complexitySchema = z.enum(['LOW', 'MEDIUM', 'HIGH']);

// Mirrors the seeded "playwright-api-automation" AiPrompt jsonSchema (packages/database/prisma/seed.ts).
export const apiAutomationOutputSchema = z.object({
  testFileName: z.string().min(1),
  testFileContent: z.string().min(1),
  automationReadinessScore: z.number().min(0).max(100),
  estimatedEffortHours: z.number().min(0).default(0),
  complexityLevel: complexitySchema,
  requiredPreconditions: z.array(z.string().min(1)).default([]),
  missingRequirementDetails: z.array(z.string().min(1)).default([]),
  rationale: z.string().default(''),
});
export type ApiAutomationOutput = z.infer<typeof apiAutomationOutputSchema>;

// Mirrors the seeded "playwright-ui-automation" AiPrompt jsonSchema.
export const uiAutomationOutputSchema = z.object({
  pageObjectFileName: z.string().min(1),
  pageObjectFileContent: z.string().min(1),
  testFileName: z.string().min(1),
  testFileContent: z.string().min(1),
  automationReadinessScore: z.number().min(0).max(100),
  estimatedEffortHours: z.number().min(0).default(0),
  complexityLevel: complexitySchema,
  requiredPreconditions: z.array(z.string().min(1)).default([]),
  missingRequirementDetails: z.array(z.string().min(1)).default([]),
  rationale: z.string().default(''),
});
export type UiAutomationOutput = z.infer<typeof uiAutomationOutputSchema>;
