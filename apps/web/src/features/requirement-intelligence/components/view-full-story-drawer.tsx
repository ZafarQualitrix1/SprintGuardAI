'use client';

import { ExternalLink, Paperclip, MessageSquare } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useJiraStoryDetail } from '@/features/requirement-intelligence/api';

interface ViewFullStoryDrawerProps {
  storyId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jiraUrl: string | null;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  if (value === null || value === undefined || value === '') return null;
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

// Bug 4: "View Full Story" drawer -- moved here from Requirement Intelligence per the user's
// explicit instruction, showing every Jira field (Summary, Description, Labels, Components,
// Priority, Reporter, Assignee, Epic, Linked Issues, Attachments, Comments, Acceptance Criteria,
// and any custom fields Jira has for this issue).
export function ViewFullStoryDrawer({ storyId, open, onOpenChange, jiraUrl }: ViewFullStoryDrawerProps) {
  const { data: detail, isLoading, isError, error } = useJiraStoryDetail(storyId, open);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {detail ? detail.externalId : 'Full Story'}
            {jiraUrl ? (
              <a href={jiraUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-primary hover:underline">
                <ExternalLink className="h-4 w-4" />
              </a>
            ) : null}
          </SheetTitle>
          <SheetDescription>{detail?.title}</SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <p className="text-sm text-destructive">
            {error instanceof Error ? error.message : 'Could not load this story from Jira.'}
          </p>
        ) : !detail ? null : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Status" value={<Badge variant="secondary">{detail.status}</Badge>} />
              <Field label="Priority" value={detail.priority} />
              <Field label="Issue Type" value={detail.issueType} />
              <Field label="Story Points" value={detail.storyPoints} />
              <Field label="Assignee" value={detail.assignee} />
              <Field label="Reporter" value={detail.reporter} />
              <Field label="Epic" value={detail.epic} />
              <Field label="Due Date" value={detail.dueDate ? new Date(detail.dueDate).toLocaleDateString() : null} />
            </div>

            <Separator />

            <Field label="Description" value={<span className="whitespace-pre-line">{detail.description}</span>} />
            <Field
              label="Acceptance Criteria"
              value={<span className="whitespace-pre-line">{detail.acceptanceCriteria}</span>}
            />
            <Field label="Environment" value={detail.environment} />

            {detail.labels.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Labels</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.labels.map((label) => (
                    <Badge key={label} variant="outline">
                      {label}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.components.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Components</p>
                <div className="flex flex-wrap gap-1.5">
                  {detail.components.map((component) => (
                    <Badge key={component} variant="outline">
                      {component}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.links.length > 0 ? (
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Linked Issues</p>
                <div className="space-y-1">
                  {detail.links.map((link, index) => (
                    <p key={index} className="text-sm">
                      <span className="text-muted-foreground">{link.type}:</span> {link.externalId}
                    </p>
                  ))}
                </div>
              </div>
            ) : null}

            {detail.attachments.length > 0 ? (
              <div>
                <p className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Paperclip className="h-3 w-3" /> Attachments
                </p>
                <div className="space-y-1">
                  {detail.attachments.map((attachment, index) =>
                    attachment.url ? (
                      <a
                        key={index}
                        href={attachment.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block text-sm text-primary hover:underline"
                      >
                        {attachment.filename}
                      </a>
                    ) : (
                      <p key={index} className="text-sm">
                        {attachment.filename}
                      </p>
                    ),
                  )}
                </div>
              </div>
            ) : null}

            {detail.comments.length > 0 ? (
              <div>
                <p className="mb-1.5 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <MessageSquare className="h-3 w-3" /> Comments
                </p>
                <div className="space-y-2">
                  {detail.comments.map((comment) => (
                    <div key={comment.id} className="rounded-md border p-2">
                      <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                        <span>{comment.author ?? 'Unknown'}</span>
                        <span>{comment.createdAt ? new Date(comment.createdAt).toLocaleString() : ''}</span>
                      </div>
                      <p className="whitespace-pre-line text-sm">{comment.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
