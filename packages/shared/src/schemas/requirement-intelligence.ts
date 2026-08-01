export interface AcceptanceCriterion {
  id: string;
  given: string;
  when: string;
  then: string;
}

export interface Requirement {
  id: string;
  text: string;
  type: string;
  confidenceScore: number | null;
  acceptanceCriteria: AcceptanceCriterion[];
}

// Deep, Groq-backed Requirement Intelligence report: business-analyst/QA-architect analysis +
// an enterprise test suite + self-assessed coverage, versioned per story. Deliberately separate
// from Requirement/AcceptanceCriterion above (which stay normalized and feed the Coverage tab).
export interface RequirementAnalysisTestCase {
  id: string;
  title: string;
  objective: string;
  module: string;
  requirementMapping: string[];
  preconditions: string[];
  testData: string;
  steps: { step: string; expected: string }[];
  expectedResult: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  testType:
    | 'FUNCTIONAL'
    | 'REGRESSION'
    | 'INTEGRATION'
    | 'API'
    | 'UI'
    | 'SECURITY'
    | 'PERFORMANCE'
    | 'ACCESSIBILITY'
    | 'SMOKE';
  automationCandidate: boolean;
  classification: 'API' | 'UI' | 'MANUAL';
  positiveOrNegative: 'POSITIVE' | 'NEGATIVE';
  tags: string[];
  dependencies: string[];
}

export interface RequirementAnalysisCoverage {
  requirementCoveragePct: number;
  businessRuleCoveragePct: number;
  acceptanceCriteriaCoveragePct: number;
  validationCoveragePct: number;
  edgeCaseCoveragePct: number;
  riskCoveragePct: number;
  overallPct: number;
  uncovered: string[];
}

export interface RequirementAnalysisContent {
  summary: string;
  functionalRequirements: string[];
  nonFunctionalRequirements: {
    performance: string[];
    security: string[];
    scalability: string[];
    reliability: string[];
    accessibility: string[];
    compatibility: string[];
  };
  acceptanceCriteriaAnalysis: {
    rewritten: string[];
    missing: string[];
    ambiguous: string[];
    conflicting: string[];
  };
  businessRules: string[];
  assumptions: string[];
  dependencies: { internal: string[]; external: string[] };
  risks: {
    business: string[];
    technical: string[];
    testing: string[];
    deployment: string[];
  };
  edgeCases: string[];
  negativeScenarios: string[];
  validationRules: string[];
  missingRequirements: {
    validations: string[];
    workflows: string[];
    businessRules: string[];
    acceptanceCriteria: string[];
  };
  apiImpact: string[];
  databaseImpact: string[];
  uiImpact: string[];
  automationFeasibility: {
    apiAutomation: string[];
    uiAutomation: string[];
    regressionCandidates: string[];
    smokeCandidates: string[];
  };
  testStrategy: {
    functional: string[];
    regression: string[];
    integration: string[];
    api: string[];
    ui: string[];
    performance: string[];
    security: string[];
    accessibility: string[];
  };
}

export interface RequirementAnalysisReport {
  id: string;
  storyId: string;
  sprintId: string;
  aiProvider: string;
  model: string;
  promptVersion: string;
  version: number;
  isLatest: boolean;
  generatedBy: string | null;
  analysis: RequirementAnalysisContent;
  testCases: RequirementAnalysisTestCase[];
  coverage: RequirementAnalysisCoverage;
  confidenceScore: number | null;
  createdAt: string;
}
