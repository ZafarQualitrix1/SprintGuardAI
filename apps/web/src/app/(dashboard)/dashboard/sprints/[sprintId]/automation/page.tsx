'use client';

import { useParams } from 'next/navigation';
import { PageHeader } from '@/components/layout/page-header';
import { AutomationTab } from '@/features/automation/components';

export default function AutomationPage() {
  const params = useParams<{ sprintId: string }>();

  return (
    <div>
      <PageHeader
        title="Automation"
        description="AI-generated Playwright automation for automatable test cases in this sprint."
      />
      <AutomationTab sprintId={params.sprintId} />
    </div>
  );
}
