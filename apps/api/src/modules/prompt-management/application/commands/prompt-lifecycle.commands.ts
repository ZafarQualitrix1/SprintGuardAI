import { BadRequestException, ConflictException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { PROMPT_REPOSITORY, IPromptRepository } from '../../domain/repositories/prompt.repository.interface';
import { PromptEntity } from '../../domain/entities/prompt.entity';
import { AiOrchestrationService } from '../../../ai/application/services/ai-orchestration.service';

// The full set of small DRAFT -> IN_REVIEW -> APPROVED -> ACTIVE -> DEPRECATED transitions, kept
// in one file since each is a few lines and they're conceptually one state machine (mirrors the
// enum in schema.prisma exactly -- see PromptStatus).

export class SubmitPromptForReviewCommand {
  constructor(public readonly promptId: string) {}
}

@CommandHandler(SubmitPromptForReviewCommand)
export class SubmitPromptForReviewHandler implements ICommandHandler<SubmitPromptForReviewCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(command: SubmitPromptForReviewCommand): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.status !== 'DRAFT') {
      throw new ConflictException('Only a DRAFT version can be submitted for review');
    }
    return this.promptRepository.setStatus(command.promptId, 'IN_REVIEW');
  }
}

export class ApprovePromptCommand {
  constructor(
    public readonly promptId: string,
    public readonly reviewerId: string,
    public readonly rationale: string | null,
  ) {}
}

@CommandHandler(ApprovePromptCommand)
export class ApprovePromptHandler implements ICommandHandler<ApprovePromptCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(command: ApprovePromptCommand): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.status !== 'IN_REVIEW' && prompt.status !== 'DRAFT') {
      throw new ConflictException('Only a DRAFT or IN_REVIEW version can be approved');
    }
    await this.promptRepository.createApproval(command.promptId, command.reviewerId, 'APPROVED', command.rationale);
    return this.promptRepository.setStatus(command.promptId, 'APPROVED');
  }
}

export class RejectPromptCommand {
  constructor(
    public readonly promptId: string,
    public readonly reviewerId: string,
    public readonly rationale: string,
  ) {}
}

@CommandHandler(RejectPromptCommand)
export class RejectPromptHandler implements ICommandHandler<RejectPromptCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(command: RejectPromptCommand): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.status !== 'IN_REVIEW') {
      throw new ConflictException('Only an IN_REVIEW version can be rejected');
    }
    await this.promptRepository.createApproval(command.promptId, command.reviewerId, 'REJECTED', command.rationale);
    // Rejected sends it back to DRAFT for editing -- PromptStatus has no dedicated REJECTED value,
    // the rejection itself is recorded permanently on the PromptApproval row.
    return this.promptRepository.setStatus(command.promptId, 'DRAFT');
  }
}

export class ActivatePromptCommand {
  constructor(public readonly promptId: string) {}
}

@CommandHandler(ActivatePromptCommand)
export class ActivatePromptHandler implements ICommandHandler<ActivatePromptCommand, PromptEntity> {
  constructor(
    @Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: ActivatePromptCommand): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.status !== 'APPROVED') {
      throw new BadRequestException('Only an APPROVED version can be activated -- submit for review and get it approved first.');
    }
    const activated = await this.promptRepository.activate(command.promptId, prompt.capability);
    // AiOrchestrationService.execute() caches the active prompt per capability for
    // REFERENCE_DATA_CACHE_TTL_MS -- without this, the next execute() call for this capability could
    // keep using the version that was just superseded for up to that long.
    this.aiOrchestrationService.invalidatePromptCapabilityCache(prompt.capability);
    return activated;
  }
}

export class ArchivePromptCommand {
  constructor(public readonly promptId: string) {}
}

@CommandHandler(ArchivePromptCommand)
export class ArchivePromptHandler implements ICommandHandler<ArchivePromptCommand, PromptEntity> {
  constructor(@Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository) {}

  async execute(command: ArchivePromptCommand): Promise<PromptEntity> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.isActive) {
      throw new ConflictException('Cannot archive the active version -- activate a different version first, or this capability will have no active prompt.');
    }
    return this.promptRepository.setStatus(command.promptId, 'DEPRECATED');
  }
}

export class DeletePromptCommand {
  constructor(public readonly promptId: string) {}
}

@CommandHandler(DeletePromptCommand)
export class DeletePromptHandler implements ICommandHandler<DeletePromptCommand, void> {
  constructor(
    @Inject(PROMPT_REPOSITORY) private readonly promptRepository: IPromptRepository,
    private readonly aiOrchestrationService: AiOrchestrationService,
  ) {}

  async execute(command: DeletePromptCommand): Promise<void> {
    const prompt = await this.promptRepository.findById(command.promptId);
    if (!prompt) throw new NotFoundException('Prompt not found');
    if (prompt.status !== 'DRAFT') {
      throw new ConflictException('Only a DRAFT version can be deleted -- archive it instead if it was ever activated.');
    }
    const responseCount = await this.promptRepository.countResponsesForPrompt(command.promptId);
    if (responseCount > 0) {
      throw new ConflictException('This version has execution history and cannot be deleted -- archive it instead.');
    }
    await this.promptRepository.delete(command.promptId);
    // A cached findById(promptId) result (e.g. from a Prompt Playground test run against this exact
    // draft) must not keep being served for a row that no longer exists.
    this.aiOrchestrationService.invalidatePromptByIdCache(command.promptId);
  }
}
