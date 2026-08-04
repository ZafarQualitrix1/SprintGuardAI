import { ReleaseReportBreakdown } from '../../domain/entities/release-report.entity';

const STATUS_LABEL: Record<ReleaseReportBreakdown['releaseStatus'], string> = {
  BLOCKED: 'blocked',
  NEEDS_PM_APPROVAL: 'pending PM approval',
  CONDITIONAL_APPROVAL: 'conditionally approved',
  APPROVED: 'approved',
};

// Deterministic, rule-based executive summary -- used whenever the AI narrative call fails (no
// provider key configured, rate limited, etc.) so the page never falls back to a bare "No
// AI-generated summary is available" message. Mirrors the tone of the spec's worked examples
// ("Sprint is currently X% release ready... Deployment is blocked because...").
export function generateFallbackSummary(sprintName: string, readinessScore: number, breakdown: ReleaseReportBreakdown): string {
  const lines: string[] = [];
  lines.push(
    `${sprintName} is currently ${readinessScore}% release ready (${STATUS_LABEL[breakdown.releaseStatus]}).`,
  );
  lines.push(`Requirement coverage is ${breakdown.requirementCoveragePercent}%.`);
  lines.push(`Automation pass rate is ${breakdown.automationPassRate}%.`);
  lines.push(`Manual pass rate is ${breakdown.manualPassRate}%.`);
  lines.push(breakdown.regressionCompleted ? 'Regression completed successfully.' : 'Regression testing is incomplete.');

  const { openCounts } = breakdown.bugRisk;
  if (openCounts.BLOCKER > 0) {
    lines.push(
      `${openCounts.BLOCKER} Blocker defect(s) remain unresolved — deployment to Production is not recommended.`,
    );
  } else if (openCounts.CRITICAL > 0) {
    lines.push(
      `${openCounts.CRITICAL} Critical defect(s) remain unresolved and require PM approval before deployment.`,
    );
  } else {
    lines.push('No Blocker or Critical defects exist.');
  }

  const otherOpen = openCounts.HIGH + openCounts.MAJOR + openCounts.MEDIUM + openCounts.MINOR + openCounts.TRIVIAL;
  if (otherOpen > 0) {
    lines.push(`${otherOpen} lower-severity defect(s) remain open with low-to-moderate business impact.`);
  }

  if (!breakdown.deploymentChecklistComplete) {
    lines.push('Deployment checklist is incomplete.');
  }

  lines.push(
    breakdown.releaseStatus === 'APPROVED'
      ? 'Deployment to Production is recommended.'
      : breakdown.releaseStatus === 'BLOCKED'
        ? 'Production deployment is not recommended until the items above are resolved.'
        : 'Production deployment requires the approvals above before proceeding.',
  );

  return lines.join('\n');
}
