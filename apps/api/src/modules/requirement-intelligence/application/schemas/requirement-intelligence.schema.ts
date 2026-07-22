import { z } from 'zod';

// Mirrors the JSON Schema stored on the seeded AiPrompt row (packages/database/prisma/seed.ts,
// capability "requirement-intelligence") -- kept as a Zod schema here because runtime validation
// in TypeScript is far more ergonomic with Zod than hand-rolled JSON Schema + ajv; the DB copy is
// the governance/audit record (Solution Architecture §16.3), this is the enforcement mechanism.
export const requirementIntelligenceOutputSchema = z.object({
  requirements: z
    .array(
      z.object({
        text: z.string().min(1),
        type: z.enum(['FUNCTIONAL', 'NON_FUNCTIONAL', 'BUSINESS_RULE', 'CONSTRAINT']),
        acceptanceCriteria: z
          .array(
            z.object({
              given: z.string().min(1),
              when: z.string().min(1),
              then: z.string().min(1),
            }),
          )
          .min(1),
      }),
    )
    .min(1),
});

export type RequirementIntelligenceOutput = z.infer<typeof requirementIntelligenceOutputSchema>;
