import { CoverageDimensions, CoverageSummary, TraceabilityRequirement } from '../../domain/entities/coverage.entity';
import {
  SprintCoverageSource,
  StoryCoverageSource,
} from '../../domain/repositories/coverage-source-read.repository.interface';
import { CoverageMatrixEntryDraft, GapDraft } from '../../domain/repositories/coverage.repository.interface';

export interface DerivedCoverage {
  entries: CoverageMatrixEntryDraft[];
  gaps: GapDraft[];
  summary: CoverageSummary;
}

// Pure, DB-free derivation -- mirrors compute-readiness.util.ts's pattern (release module) so
// this is trivially unit-testable with fixture data. One requirement produces at most one matrix
// entry and at most one gap: a requirement with zero acceptance criteria can't also have a
// "missing test" gap (there's nothing to test yet), so MISSING_AC and MISSING_TEST are mutually
// exclusive per requirement.
// Narrowed to just `requirements` (not the full SprintCoverageSource) so the story-scoped source
// -- whose `requirements` are a structurally-compatible superset shape, not the sprint one -- can
// reuse this same core AC-coverage algorithm without a cast (see deriveStoryCoverage below).
export function deriveCoverage(source: Pick<SprintCoverageSource, 'requirements'>): DerivedCoverage {
  const entries: CoverageMatrixEntryDraft[] = [];
  const gaps: GapDraft[] = [];

  let coveredCount = 0;
  let partiallyCoveredCount = 0;
  let notCoveredCount = 0;

  for (const requirement of source.requirements) {
    if (requirement.acceptanceCriteria.length === 0) {
      entries.push({ requirementId: requirement.id, coverageStatus: 'NOT_COVERED', testCaseId: null });
      gaps.push({
        requirementId: requirement.id,
        gapType: 'MISSING_AC',
        severity: 'MEDIUM',
        description: `"${requirement.text}" has no acceptance criteria yet, so it can't be tested.`,
      });
      notCoveredCount += 1;
      continue;
    }

    const coveredAcs = requirement.acceptanceCriteria.filter((ac) => ac.hasTestCase);
    const firstTestCaseId = coveredAcs.find((ac) => ac.firstTestCaseId)?.firstTestCaseId ?? null;

    if (coveredAcs.length === requirement.acceptanceCriteria.length) {
      entries.push({ requirementId: requirement.id, coverageStatus: 'COVERED', testCaseId: firstTestCaseId });
      coveredCount += 1;
    } else if (coveredAcs.length === 0) {
      entries.push({ requirementId: requirement.id, coverageStatus: 'NOT_COVERED', testCaseId: null });
      gaps.push({
        requirementId: requirement.id,
        gapType: 'MISSING_TEST',
        severity: 'HIGH',
        description: `"${requirement.text}" has ${requirement.acceptanceCriteria.length} acceptance criteria and none have any test cases.`,
      });
      notCoveredCount += 1;
    } else {
      const missingCount = requirement.acceptanceCriteria.length - coveredAcs.length;
      entries.push({ requirementId: requirement.id, coverageStatus: 'PARTIALLY_COVERED', testCaseId: firstTestCaseId });
      gaps.push({
        requirementId: requirement.id,
        gapType: 'MISSING_TEST',
        severity: 'MEDIUM',
        description: `"${requirement.text}" has ${missingCount} of ${requirement.acceptanceCriteria.length} acceptance criteria without any test cases.`,
      });
      partiallyCoveredCount += 1;
    }
  }

  const totalRequirements = source.requirements.length;
  const coveragePercent = totalRequirements === 0 ? 0 : Math.round((coveredCount / totalRequirements) * 100);

  return {
    entries,
    gaps,
    summary: { totalRequirements, coveredCount, partiallyCoveredCount, notCoveredCount, coveragePercent },
  };
}

export interface DerivedStoryCoverage extends DerivedCoverage {
  dimensions: CoverageDimensions;
  missingTestScenarios: string[];
  missingAcceptanceCriteria: string[];
  traceabilityMatrix: TraceabilityRequirement[];
}

const CATEGORY_TEST_TYPES = {
  functional: 'FUNCTIONAL',
  boundary: 'BOUNDARY',
  negative: 'NEGATIVE',
} as const;

const RISK_PRIORITIES = new Set(['HIGH', 'CRITICAL']);

function percent(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 100);
}

// Story-scoped variant of deriveCoverage above: same AC-coverage core (kept byte-identical in
// spirit, not shared code, since the two source shapes differ), plus the dimension breakdown,
// missing-edge-case heuristic, and traceability matrix that only make sense once the acceptance
// criteria/test-case detail is available (the sprint-wide source deliberately only fetches test
// case `id` -- fetching every test case's full detail across a whole sprint just to throw it away
// would be wasteful, so that path is untouched).
export function deriveStoryCoverage(source: StoryCoverageSource): DerivedStoryCoverage {
  const { entries, gaps, summary } = deriveCoverage(source);

  const traceabilityMatrix: TraceabilityRequirement[] = [];

  let acTotal = 0;
  let acCovered = 0;
  let acRiskCovered = 0;
  const categoryCovered: Record<keyof typeof CATEGORY_TEST_TYPES, number> = {
    functional: 0,
    boundary: 0,
    negative: 0,
  };
  let totalTestCases = 0;
  let automatedTestCases = 0;

  for (const requirement of source.requirements) {
    traceabilityMatrix.push({
      requirementId: requirement.id,
      requirementText: requirement.text,
      acceptanceCriteria: requirement.acceptanceCriteria.map((ac) => ({
        id: ac.id,
        given: ac.given,
        when: ac.when,
        then: ac.then,
        testCases: ac.testCases,
      })),
    });

    for (const ac of requirement.acceptanceCriteria) {
      acTotal += 1;
      if (ac.hasTestCase) acCovered += 1;

      const typesPresent = new Set(ac.testCases.map((tc) => tc.testType));
      for (const [key, testType] of Object.entries(CATEGORY_TEST_TYPES) as [keyof typeof CATEGORY_TEST_TYPES, string][]) {
        if (typesPresent.has(testType)) categoryCovered[key] += 1;
      }

      if (ac.testCases.some((tc) => RISK_PRIORITIES.has(tc.priority))) acRiskCovered += 1;

      for (const tc of ac.testCases) {
        totalTestCases += 1;
        if (tc.automationStatus === 'AUTOMATED') automatedTestCases += 1;
      }
    }
  }

  const dimensions: CoverageDimensions = {
    requirementCoverage: summary.coveragePercent,
    acceptanceCriteriaCoverage: percent(acCovered, acTotal),
    functionalCoverage: percent(categoryCovered.functional, acTotal),
    boundaryCoverage: percent(categoryCovered.boundary, acTotal),
    negativeCoverage: percent(categoryCovered.negative, acTotal),
    riskCoverage: percent(acRiskCovered, acTotal),
    automationCoverage: percent(automatedTestCases, totalTestCases),
  };

  const missingTestScenarios = gaps.filter((gap) => gap.gapType === 'MISSING_TEST').map((gap) => gap.description);
  const missingAcceptanceCriteria = gaps.filter((gap) => gap.gapType === 'MISSING_AC').map((gap) => gap.description);

  return { entries, gaps, summary, dimensions, missingTestScenarios, missingAcceptanceCriteria, traceabilityMatrix };
}
