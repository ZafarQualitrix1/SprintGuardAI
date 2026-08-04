'use client';

import { useEffect, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import { useSubmissionDraft, useSubmitForReview } from '@/features/ba-review/api';
import { JiraUserPicker } from './jira-user-picker';
import type { JiraUserMatch } from '../types';

const ACCEPTED_ATTACHMENT_TYPES = '.xlsx,.csv,.pdf,.docx';
const MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024;

interface SubmitForReviewDialogProps {
  storyId: string;
  storyTitle: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubmitForReviewDialog({ storyId, storyTitle, open, onOpenChange }: SubmitForReviewDialogProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [mention, setMention] = useState<JiraUserMatch[]>([]);
  const [ccMentions, setCcMentions] = useState<JiraUserMatch[]>([]);
  const [summary, setSummary] = useState('');
  const [summaryTouched, setSummaryTouched] = useState(false);
  const [comment, setComment] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);

  const { data: draft, isLoading: draftLoading } = useSubmissionDraft(storyId, open);
  const submit = useSubmitForReview(storyId);

  // Reset per-open, and only overwrite the summary with the AI draft if the user hasn't edited it
  // yet (a refetch on reopen shouldn't clobber an in-progress edit).
  useEffect(() => {
    if (!open) {
      setConfirmOpen(false);
      setMention([]);
      setCcMentions([]);
      setSummary('');
      setSummaryTouched(false);
      setComment('');
      setAttachment(null);
      setAttachmentError(null);
    }
  }, [open]);

  useEffect(() => {
    if (draft && !summaryTouched) {
      setSummary(draft.summary);
    }
  }, [draft, summaryTouched]);

  const onAttachmentChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_ATTACHMENT_BYTES) {
      setAttachmentError('File must be 10MB or smaller.');
      setAttachment(null);
      return;
    }
    setAttachmentError(null);
    setAttachment(file);
  };

  const canSubmit = mention.length === 1 && summary.trim().length > 0 && !attachmentError;

  const onConfirmSubmit = () => {
    const primaryMention = mention[0];
    if (!primaryMention) return;
    submit.mutate(
      {
        mentionAccountId: primaryMention.accountId,
        mentionDisplayName: primaryMention.displayName,
        ccMentions: ccMentions.map((cc) => ({ accountId: cc.accountId, displayName: cc.displayName })),
        summary,
        comment: comment.trim() || null,
        attachment,
      },
      {
        onSuccess: () => {
          toast({ title: 'Submitted for review', description: `${storyTitle} was posted to Jira.` });
          setConfirmOpen(false);
          onOpenChange(false);
        },
        onError: (error) => {
          setConfirmOpen(false);
          toast({
            variant: 'destructive',
            title: 'Could not submit for review',
            description: error instanceof ApiError ? error.message : undefined,
          });
        },
      },
    );
  };

  return (
    <>
      <Dialog open={open && !confirmOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Submit for Review</DialogTitle>
            <DialogDescription>
              Posts a Jira comment with the test case summary and document attached to {storyTitle}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>BA to mention (required)</Label>
              <JiraUserPicker storyId={storyId} selected={mention} onChange={setMention} placeholder="Search for the reviewing BA…" />
            </div>

            <div className="space-y-1.5">
              <Label>CC (optional)</Label>
              <JiraUserPicker storyId={storyId} selected={ccMentions} onChange={setCcMentions} multiple placeholder="Add more Jira users to CC…" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="submission-summary">Summary</Label>
              {draftLoading ? (
                <Skeleton className="h-20 w-full" />
              ) : (
                <Textarea
                  id="submission-summary"
                  rows={4}
                  value={summary}
                  onChange={(e) => {
                    setSummary(e.target.value);
                    setSummaryTouched(true);
                  }}
                />
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="submission-attachment">Attachment</Label>
              <Input
                id="submission-attachment"
                type="file"
                accept={ACCEPTED_ATTACHMENT_TYPES}
                onChange={onAttachmentChange}
              />
              <p className="text-xs text-muted-foreground">
                {attachment
                  ? `Replacing the default document with "${attachment.name}".`
                  : 'Leave blank to attach the generated test case workbook.'}
              </p>
              {attachmentError ? <p className="text-xs text-destructive">{attachmentError}</p> : null}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="submission-comment">Additional comment (optional)</Label>
              <Textarea
                id="submission-comment"
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Anything else the reviewer should know…"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={() => setConfirmOpen(true)} disabled={!canSubmit}>
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit test cases for BA review?</AlertDialogTitle>
            <AlertDialogDescription>
              This will create a Jira comment on {storyTitle}, attach the test case document, and notify the
              selected reviewers. This action can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submit.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: 'default' }))}
              onClick={(e) => {
                e.preventDefault();
                onConfirmSubmit();
              }}
              disabled={submit.isPending}
            >
              {submit.isPending ? 'Submitting…' : 'OK'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
