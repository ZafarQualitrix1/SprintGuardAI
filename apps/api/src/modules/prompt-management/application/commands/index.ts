// Command handlers (CQRS writes) for the Prompt Management bounded context.
export * from './create-prompt.command';
export * from './create-prompt-version.command';
export * from './update-prompt-draft.command';
export * from './clone-prompt.command';
export * from './prompt-lifecycle.commands';
export * from './run-prompt-playground.command';

import { CreatePromptHandler } from './create-prompt.command';
import { CreatePromptVersionHandler } from './create-prompt-version.command';
import { UpdatePromptDraftHandler } from './update-prompt-draft.command';
import { ClonePromptHandler } from './clone-prompt.command';
import {
  SubmitPromptForReviewHandler,
  ApprovePromptHandler,
  RejectPromptHandler,
  ActivatePromptHandler,
  ArchivePromptHandler,
  DeletePromptHandler,
} from './prompt-lifecycle.commands';
import { RunPromptPlaygroundHandler } from './run-prompt-playground.command';

export const PROMPT_MANAGEMENT_COMMAND_HANDLERS = [
  CreatePromptHandler,
  CreatePromptVersionHandler,
  UpdatePromptDraftHandler,
  ClonePromptHandler,
  SubmitPromptForReviewHandler,
  ApprovePromptHandler,
  RejectPromptHandler,
  ActivatePromptHandler,
  ArchivePromptHandler,
  DeletePromptHandler,
  RunPromptPlaygroundHandler,
];
