'use client';

import { PageHeader } from '@/components/layout/page-header';
import { Skeleton } from '@/components/ui/skeleton';

// Shell only -- the real filter cascade (Project -> Sprint -> Story -> Test Case), candidate grid,
// and bulk generate/run actions land in a later pass.
export default function ApiAutomationPage() {
  return (
    <div>
      <PageHeader
        title="API Automation"
        description="AI-generated Playwright API automation for BA-approved, locked test cases."
      />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}
