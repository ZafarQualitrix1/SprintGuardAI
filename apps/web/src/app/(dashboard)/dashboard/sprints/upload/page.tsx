'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createProjectSchema, type CreateProjectInput } from '@sprintguard/shared';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConnectJiraCard } from '@/features/integration/components';
import { useIntegrationConnections } from '@/features/integration/api';
import { useCreateProject, useImportJiraSprint, useProjects } from '@/features/sprint/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';

const CREATE_NEW_PROJECT = '__create_new__';

export default function SprintUploadPage() {
  const router = useRouter();
  const { data: connections, isLoading: connectionsLoading } = useIntegrationConnections();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();
  const importSprint = useImportJiraSprint();

  const [projectId, setProjectId] = useState<string>('');
  const [connectionId, setConnectionId] = useState<string>('');
  const [reference, setReference] = useState('');

  const {
    register: registerProject,
    handleSubmit: handleProjectSubmit,
    formState: { errors: projectErrors },
    reset: resetProjectForm,
  } = useForm<CreateProjectInput>({ resolver: zodResolver(createProjectSchema) });

  const isCreatingProject = projectId === CREATE_NEW_PROJECT;

  const onCreateProject = async (values: CreateProjectInput) => {
    try {
      const project = await createProject.mutateAsync(values);
      setProjectId(project.id);
      resetProjectForm();
      toast({ title: 'Project created', description: `${project.name} (${project.key})` });
    } catch {
      // Inline error banner below the form already surfaces this; nothing further to do here.
    }
  };

  const onImport = async () => {
    if (!projectId || projectId === CREATE_NEW_PROJECT || !connectionId || !reference) {
      return;
    }
    try {
      const sprint = await importSprint.mutateAsync({ projectId, connectionId, reference });
      toast({ title: 'Sprint imported', description: `${sprint.name} — ${sprint.stories.length} stories` });
      router.push(`/dashboard/sprints/${sprint.id}` as never);
    } catch {
      toast({
        variant: 'destructive',
        title: 'Import failed',
        description:
          importSprint.error instanceof ApiError ? importSprint.error.message : 'Could not import this sprint.',
      });
    }
  };

  if (connectionsLoading || projectsLoading) {
    return (
      <div>
        <PageHeader title="Sprint Upload" description="Import a sprint from Jira." />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!connections || connections.length === 0) {
    return (
      <div>
        <PageHeader
          title="Sprint Upload"
          description="Connect Jira to start importing sprints by link or id."
        />
        <ConnectJiraCard />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sprint Upload"
        description="Paste a Jira sprint link or id to import its stories."
      />
      <Card>
        <CardHeader>
          <CardTitle>Import a sprint</CardTitle>
          <CardDescription>
            Choose a project, then paste the sprint&apos;s Jira link (the board URL with
            <span className="mx-1 font-mono text-xs">?sprintId=</span>) or its numeric id.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="project">Project</Label>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger id="project">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects?.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.key})
                  </SelectItem>
                ))}
                <SelectItem value={CREATE_NEW_PROJECT}>+ Create new project</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isCreatingProject ? (
            <form
              className="space-y-4 rounded-md border border-dashed p-4"
              onSubmit={handleProjectSubmit(onCreateProject)}
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="key">Project key</Label>
                  <Input id="key" placeholder="PROJ" {...registerProject('key')} />
                  {projectErrors.key ? (
                    <p className="text-xs text-destructive">{projectErrors.key.message}</p>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Project name</Label>
                  <Input id="name" placeholder="Payments Platform" {...registerProject('name')} />
                  {projectErrors.name ? (
                    <p className="text-xs text-destructive">{projectErrors.name.message}</p>
                  ) : null}
                </div>
              </div>
              {createProject.isError ? (
                <p className="text-sm text-destructive">
                  {createProject.error instanceof ApiError
                    ? createProject.error.message
                    : 'Could not create project.'}
                </p>
              ) : null}
              <Button type="submit" size="sm" disabled={createProject.isPending}>
                {createProject.isPending ? 'Creating…' : 'Create project'}
              </Button>
            </form>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="connection">Jira connection</Label>
            <Select value={connectionId} onValueChange={setConnectionId}>
              <SelectTrigger id="connection">
                <SelectValue placeholder="Select a connection" />
              </SelectTrigger>
              <SelectContent>
                {connections.map((connection) => (
                  <SelectItem key={connection.id} value={connection.id}>
                    {connection.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reference">Sprint link or id</Label>
            <Input
              id="reference"
              placeholder="https://acme.atlassian.net/jira/software/projects/PROJ/boards/1?sprintId=123"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {importSprint.isError ? (
            <p className="text-sm text-destructive">
              {importSprint.error instanceof ApiError
                ? importSprint.error.message
                : 'Could not import this sprint.'}
            </p>
          ) : null}

          <Button
            onClick={onImport}
            disabled={
              importSprint.isPending ||
              !projectId ||
              isCreatingProject ||
              !connectionId ||
              !reference
            }
          >
            {importSprint.isPending ? 'Importing…' : 'Import sprint'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
