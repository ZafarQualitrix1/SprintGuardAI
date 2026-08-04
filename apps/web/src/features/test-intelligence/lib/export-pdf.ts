import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { TestScenario } from '@sprintguard/shared';

// PDF export runs client-side (unlike the xlsx/csv formats, which are server-generated) -- jsPDF
// has no server-side precedent in this repo and is fundamentally a browser library. Mirrors
// requirement-intelligence/lib/export-pdf.ts's structure, adapted for live TestScenario/TestCase
// data instead of a frozen RequirementAnalysisReport.
export function exportTestCasesToPdf(storyTitle: string, storyExternalId: string | null, scenarios: TestScenario[]): void {
  const doc = new jsPDF();
  const totalCases = scenarios.reduce((sum, s) => sum + s.testCases.length, 0);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('Test Cases', 14, 18);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(storyExternalId ? `${storyExternalId} - ${storyTitle}` : storyTitle, 14, 26);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`${scenarios.length} scenarios, ${totalCases} test cases · Exported ${new Date().toLocaleString()}`, 14, 32);
  doc.setTextColor(0);

  autoTable(doc, {
    startY: 40,
    head: [['ID', 'Scenario', 'Title', 'Steps', 'Priority', 'Severity', 'Type', 'Automation']],
    body: scenarios.flatMap((scenario) =>
      scenario.testCases.map((tc) => [
        tc.displayId ?? tc.id,
        scenario.title,
        tc.title,
        tc.steps.map((step, i) => `${i + 1}. ${step.step} -> ${step.expected}`).join('\n'),
        tc.priority,
        tc.severity,
        tc.testType,
        tc.automationStatus,
      ]),
    ),
    styles: { fontSize: 7, cellWidth: 'wrap' },
    columnStyles: { 3: { cellWidth: 60 } },
    headStyles: { fillColor: [51, 65, 85] },
  });

  doc.save(`${storyExternalId ?? 'story'}-test-cases.pdf`);
}
