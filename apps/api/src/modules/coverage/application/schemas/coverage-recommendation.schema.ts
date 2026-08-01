import { z } from 'zod';

// Mirrors the JSON Schema on the seeded "coverage-recommendation" AiPrompt row
// (packages/database/prisma/seed.ts). missingScenarios may legitimately be empty (full coverage).
export const coverageRecommendationOutputSchema = z.object({
  qualityScore: z.number().min(0).max(100),
  missingScenarios: z.array(
    z.object({
      requirementText: z.string().min(1),
      suggestedScenario: z.string().min(1),
      reason: z.string().min(1),
    }),
  ),
  summary: z.string().min(1),
});
export type CoverageRecommendationOutput = z.infer<typeof coverageRecommendationOutputSchema>;
