import { z } from 'zod';

// Output contract for the 'deep-requirement-analysis' capability (Gemini-backed). Deliberately
// separate from requirementIntelligenceOutputSchema (which stays normalized into
// Requirement/AcceptanceCriterion rows and feeds the Coverage tab) -- this is a much larger,
// versioned JSON snapshot per analysis run. Every array defaults to [] rather than requiring
// .min(1): not every story has e.g. API impact or security risks, and forcing the model to
// fabricate content for an inapplicable section produces worse output than allowing an empty one.
const stringList = z.array(z.string().min(1)).default([]);

const testCaseSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  objective: z.string().min(1),
  module: z.string().min(1),
  requirementMapping: stringList,
  preconditions: stringList,
  testData: z.string().default(''),
  steps: z
    .array(z.object({ step: z.string().min(1), expected: z.string().min(1) }))
    .min(1),
  expectedResult: z.string().min(1),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  testType: z.enum([
    'FUNCTIONAL',
    'REGRESSION',
    'INTEGRATION',
    'API',
    'UI',
    'SECURITY',
    'PERFORMANCE',
    'ACCESSIBILITY',
    'SMOKE',
  ]),
  automationCandidate: z.boolean(),
  classification: z.enum(['API', 'UI', 'MANUAL']),
  positiveOrNegative: z.enum(['POSITIVE', 'NEGATIVE']),
  tags: stringList,
  dependencies: stringList,
});

export const deepRequirementAnalysisOutputSchema = z.object({
  summary: z.string().min(1),
  functionalRequirements: stringList,
  nonFunctionalRequirements: z.object({
    performance: stringList,
    security: stringList,
    scalability: stringList,
    reliability: stringList,
    accessibility: stringList,
    compatibility: stringList,
  }),
  acceptanceCriteriaAnalysis: z.object({
    rewritten: stringList,
    missing: stringList,
    ambiguous: stringList,
    conflicting: stringList,
  }),
  businessRules: stringList,
  assumptions: stringList,
  dependencies: z.object({
    internal: stringList,
    external: stringList,
  }),
  risks: z.object({
    business: stringList,
    technical: stringList,
    testing: stringList,
    deployment: stringList,
  }),
  edgeCases: stringList,
  negativeScenarios: stringList,
  validationRules: stringList,
  missingRequirements: z.object({
    validations: stringList,
    workflows: stringList,
    businessRules: stringList,
    acceptanceCriteria: stringList,
  }),
  apiImpact: stringList,
  databaseImpact: stringList,
  uiImpact: stringList,
  automationFeasibility: z.object({
    apiAutomation: stringList,
    uiAutomation: stringList,
    regressionCandidates: stringList,
    smokeCandidates: stringList,
  }),
  testStrategy: z.object({
    functional: stringList,
    regression: stringList,
    integration: stringList,
    api: stringList,
    ui: stringList,
    performance: stringList,
    security: stringList,
    accessibility: stringList,
  }),
  testCases: z.array(testCaseSchema).min(1),
  coverage: z.object({
    requirementCoveragePct: z.number().min(0).max(100),
    businessRuleCoveragePct: z.number().min(0).max(100),
    acceptanceCriteriaCoveragePct: z.number().min(0).max(100),
    validationCoveragePct: z.number().min(0).max(100),
    edgeCaseCoveragePct: z.number().min(0).max(100),
    riskCoveragePct: z.number().min(0).max(100),
    overallPct: z.number().min(0).max(100),
    uncovered: stringList,
  }),
});

export type DeepRequirementAnalysisOutput = z.infer<typeof deepRequirementAnalysisOutputSchema>;
export type DeepRequirementAnalysisTestCase = z.infer<typeof testCaseSchema>;
