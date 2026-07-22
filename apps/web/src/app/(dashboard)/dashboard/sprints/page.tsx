'use client';

import Link from 'next/link';
import { FolderKanban, Upload } from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { EmptyState } from '@/components/layout/empty-state';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProjectSprintsSection } from '@/features/sprint/components';
import { useProjects } from '@/features/sprint/api';

export default function SprintDashboardPage() {
  const { data: projects, isLoading } = useProjects();

  return (
    <div>
      <PageHeader
        title="Sprint Dashboard"
        description="All sprints across your projects."
        actions={
          <Button asChild>
            <Link href={'/dashboard/sprints/upload' as never}>
              <Upload className="mr-2 h-4 w-4" />
              Import sprint
            </Link>
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : !projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet"
          description="Import your first sprint from Jira to create a project and start tracking coverage, risk, and release readiness."
          action={
            <Button asChild>
              <Link href={'/dashboard/sprints/upload' as never}>Import a sprint</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {projects.map((project) => (
            <ProjectSprintsSection key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
