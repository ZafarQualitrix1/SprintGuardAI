'use client';

import { useState } from 'react';
import { FileCode2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAutomationDetail } from '@/features/automation/api';

interface AutomationPreviewDialogProps {
  automationGenerationId: string | null;
  onOpenChange: (open: boolean) => void;
}

export function AutomationPreviewDialog({ automationGenerationId, onOpenChange }: AutomationPreviewDialogProps) {
  const { data: generation, isLoading } = useAutomationDetail(automationGenerationId);
  const [activePath, setActivePath] = useState<string | null>(null);

  const activeFile = generation?.files.find((f) => f.path === activePath) ?? generation?.files[0];

  return (
    <Dialog open={Boolean(automationGenerationId)} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4" />
            Generated automation preview
            {generation ? (
              <Badge variant="secondary">
                {generation.automationType} · v{generation.version}
              </Badge>
            ) : null}
          </DialogTitle>
          <DialogDescription>
            Review the generated framework and test files before saving, downloading, or committing.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !generation ? (
          <Skeleton className="h-full w-full" />
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-[220px_1fr] gap-4 overflow-hidden">
            <div className="overflow-y-auto rounded-md border">
              {generation.files.map((file) => (
                <button
                  key={file.path}
                  type="button"
                  onClick={() => setActivePath(file.path)}
                  className={`block w-full truncate px-3 py-2 text-left text-xs hover:bg-muted ${
                    (activeFile?.path ?? generation.files[0]?.path) === file.path
                      ? 'bg-muted font-medium text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {file.path}
                </button>
              ))}
            </div>
            <div className="overflow-auto rounded-md border bg-muted/30">
              <pre className="p-3 text-xs leading-relaxed">
                <code>{activeFile?.content}</code>
              </pre>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
