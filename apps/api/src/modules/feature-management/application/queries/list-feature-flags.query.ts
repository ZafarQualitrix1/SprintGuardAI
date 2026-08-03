import { Inject } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  FEATURE_FLAG_REPOSITORY,
  FeatureFlagRecord,
  IFeatureFlagRepository,
} from '../../domain/repositories/feature-flag.repository.interface';

export class ListFeatureFlagsQuery {}

@QueryHandler(ListFeatureFlagsQuery)
export class ListFeatureFlagsHandler implements IQueryHandler<ListFeatureFlagsQuery, FeatureFlagRecord[]> {
  constructor(@Inject(FEATURE_FLAG_REPOSITORY) private readonly repository: IFeatureFlagRepository) {}

  execute(): Promise<FeatureFlagRecord[]> {
    return this.repository.listAll();
  }
}
