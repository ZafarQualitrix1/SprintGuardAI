'use client';

import { useParams } from 'next/navigation';
import { SprintSubNav } from '@/features/sprint/components';

// Persistent tab navigation across every /dashboard/sprints/[sprintId]/* page -- without this,
// navigating from Coverage to Requirements (for example) had no in-app path other than the
// browser back button.
export default function SprintDetailLayout({ children }: { children: React.ReactNode }) {
  const params = useParams<{ sprintId: string }>();

  return (
    <div>
      <SprintSubNav sprintId={params.sprintId} />
      {children}
    </div>
  );
}
