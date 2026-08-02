'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { ApiError } from '@/lib/api-client';
import { useAiAgents } from '@/features/ai-settings/api';
import { useCreatePrompt } from '@/features/prompts/api';

interface CreatePromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: (capability: string, version: string) => void;
}

export function CreatePromptDialog({ open, onOpenChange, onCreated }: CreatePromptDialogProps) {
  const { data: agents } = useAiAgents();
  const create = useCreatePrompt();

  const [capability, setCapability] = useState('');
  const [agentKey, setAgentKey] = useState('');
  const [name, setName] = useState('');

  const reset = () => {
    setCapability('');
    setAgentKey('');
    setName('');
  };

  const onSubmit = () => {
    create.mutate(
      {
        capability,
        agentKey,
        name,
        template: 'You are an AI agent. {{input}}\n\nRespond with ONLY valid JSON.',
      },
      {
        onSuccess: (prompt) => {
          toast({ title: 'Prompt created', description: `${name} (v1, DRAFT)` });
          onOpenChange(false);
          reset();
          onCreated(prompt.capability, prompt.version);
        },
        onError: (error) =>
          toast({
            variant: 'destructive',
            title: 'Could not create prompt',
            description: error instanceof ApiError ? error.message : 'Something went wrong.',
          }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New prompt</DialogTitle>
          <DialogDescription>
            Creates a v1 DRAFT for a new capability. You&apos;ll fill in the template and metadata next.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Prompt name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bug Root Cause Analysis" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="capability">Capability key</Label>
            <Input
              id="capability"
              value={capability}
              onChange={(e) => setCapability(e.target.value)}
              placeholder="e.g. bug-root-cause-analysis"
            />
          </div>
          <div className="space-y-2">
            <Label>AI Agent</Label>
            <Select value={agentKey} onValueChange={setAgentKey}>
              <SelectTrigger>
                <SelectValue placeholder="Select an agent" />
              </SelectTrigger>
              <SelectContent>
                {agents?.map((agent) => (
                  <SelectItem key={agent.key} value={agent.key}>
                    {agent.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={!capability || !agentKey || !name || create.isPending}
          >
            {create.isPending ? 'Creating…' : 'Create draft'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
