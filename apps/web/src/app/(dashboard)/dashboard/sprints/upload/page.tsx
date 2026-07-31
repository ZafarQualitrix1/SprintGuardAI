'use client';

import { PageHeader } from '@/components/layout/page-header';
import { ImportWizard } from '@/features/integration/components';

export default function SprintUploadPage() {
  return (
    <div>
      <PageHeader
        title="Import a Sprint"
        description="Pick a workspace, project, board, and sprint to import."
      />
      <ImportWizard />
    </div>
  );
}
