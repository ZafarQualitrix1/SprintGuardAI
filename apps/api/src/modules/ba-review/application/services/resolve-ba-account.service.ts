import { Inject, Injectable, Logger } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ResolveExternalUserQuery } from '../../../integration/application/queries/resolve-external-user.query';
import {
  STORY_BA_REVIEW_STATE_REPOSITORY,
  IStoryBaReviewStateRepository,
} from '../../domain/repositories/story-ba-review-state.repository.interface';

export interface ResolvedBaAccount {
  accountId: string;
  displayName: string;
}

// Resolves + caches the assigned BA's Jira accountId (needed for a real ADF @mention). Cached on
// Story.assignedBaJiraAccountId until UpdateBaAssignmentCommand changes the email, so this only
// hits Jira's user-search endpoint once per BA per story. Never throws -- a failed/missing
// resolution means the comment posts without a mention, not a blocked review cycle.
@Injectable()
export class ResolveBaAccountService {
  private readonly logger = new Logger(ResolveBaAccountService.name);

  constructor(
    private readonly queryBus: QueryBus,
    @Inject(STORY_BA_REVIEW_STATE_REPOSITORY)
    private readonly stateRepository: IStoryBaReviewStateRepository,
  ) {}

  async resolve(input: {
    organizationId: string;
    connectionId: string | null;
    storyId: string;
    assignedBaEmail: string | null;
    cachedAccountId: string | null;
  }): Promise<ResolvedBaAccount | null> {
    if (!input.assignedBaEmail || !input.connectionId) {
      return null;
    }
    if (input.cachedAccountId) {
      return { accountId: input.cachedAccountId, displayName: input.assignedBaEmail };
    }

    try {
      const resolved = await this.queryBus.execute<
        ResolveExternalUserQuery,
        { accountId: string; displayName: string } | null
      >(new ResolveExternalUserQuery(input.organizationId, input.connectionId, input.assignedBaEmail));

      if (resolved) {
        await this.stateRepository.updateBaAssignment({
          storyId: input.storyId,
          assignedBaEmail: input.assignedBaEmail,
          assignedBaJiraAccountId: resolved.accountId,
          assignedBaAccountResolvedAt: new Date(),
        });
      }
      return resolved;
    } catch (error) {
      this.logger.warn(`Could not resolve Jira account for BA "${input.assignedBaEmail}": ${error}`);
      return null;
    }
  }
}
