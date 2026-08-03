'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { createProjectSchema, type CreateProjectInput } from '@sprintguard/shared';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateProject, useImportJiraSprint, useProjects } from '@/features/sprint/api';
import { ApiError } from '@/lib/api-client';
import { toast } from '@/hooks/use-toast';
import type { WizardSelection } from './import-wizard';

const CREATE_NEW_PROJECT = '__create_new__';

interface StepImportProps {
  selection: WizardSelection;
  onBack: () => void;
}

export function StepImport({ selection, onBack }: StepImportProps) {
  const router = useRouter();
  const { data: projects, isLoading: projectsLoading } = useProjects();
  const createProject = useCreateProject();
  const importSprint = useImportJiraSprint();

  const [projectId, setProjectId] = useState('');

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
      // Inline error banner below the form already surfaces this.
    }
  };

  const onImport = async () => {
    if (!projectId || isCreatingProject || !selection.connectionId || !selection.sprintExternalId) {
      return;
    }
    try {
      const sprint = await importSprint.mutateAsync({
        projectId,
        connectionId: selection.connectionId,
        reference: selection.sprintExternalId,
        smartImport: selection.smartImport,
      });
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

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{selection.sprintName}</p>
          <p className="text-xs text-muted-foreground">
            {selection.connectionName} → {selection.jiraProjectName} → {selection.boardName}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="project">Import into SprintGuard project</Label>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger id="project">
              <SelectValue placeholder={projectsLoading ? 'Loading…' : 'Select a project'} />
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
                {projectErrors.key ? <p className="text-xs text-destructive">{projectErrors.key.message}</p> : null}
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectName">Project name</Label>
                <Input id="projectName" placeholder="Payments Platform" {...registerProject('name')} />
                {projectErrors.name ? (
                  <p className="text-xs text-destructive">{projectErrors.name.message}</p>
                ) : null}
              </div>
            </div>
            {createProject.isError ? (
              <p className="text-sm text-destructive">
                {createProject.error instanceof ApiError ? createProject.error.message : 'Could not create project.'}
              </p>
            ) : null}
            <Button type="submit" size="sm" disabled={createProject.isPending}>
              {createProject.isPending ? 'Creating…' : 'Create project'}
            </Button>
          </form>
        ) : null}

        {importSprint.isError ? (
          <p className="text-sm text-destructive">
            {importSprint.error instanceof ApiError ? importSprint.error.message : 'Could not import this sprint.'}
          </p>
        ) : null}

        <div className="flex justify-between">
          <Button variant="outline" onClick={onBack}>
            Back
          </Button>
          <Button onClick={onImport} disabled={importSprint.isPending || !projectId || isCreatingProject}>
            {importSprint.isPending ? 'Importing…' : 'Import sprint'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
