'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { AutomationExecutionTab } from '@/features/automation-execution/components';

export default function AutomationExecutionPage() {
  const params = useParams<{ sprintId: string }>();

  return (
    <div>
      <PageHeader
        title="Automation Execution"
        description="Run generated Playwright automation for a story via GitHub Actions and track live progress."
      />
      <AutomationExecutionTab sprintId={params.sprintId} />
    </div>
  );
}
