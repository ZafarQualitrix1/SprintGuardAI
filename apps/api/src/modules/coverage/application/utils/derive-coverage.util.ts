import { CoverageSummary } from '../../domain/entities/coverage.entity';
import { SprintCoverageSource } from '../../domain/repositories/coverage-source-read.repository.interface';
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
export function deriveCoverage(source: SprintCoverageSource): DerivedCoverage {
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
