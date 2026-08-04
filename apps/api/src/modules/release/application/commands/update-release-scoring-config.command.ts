import { BadRequestException, Inject, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  RELEASE_METRICS_READ_REPOSITORY,
  IReleaseMetricsReadRepository,
} from '../../domain/repositories/release-metrics-read.repository.interface';
import {
  RELEASE_SCORING_CONFIG_REPOSITORY,
  IReleaseScoringConfigRepository,
} from '../../domain/repositories/release-scoring-config.repository.interface';
import { DEFECT_SEVERITIES } from '../../domain/entities/release-report.entity';
import { ReleaseScoringConfigEntity, ReleaseScoringWeights } from '../../domain/entities/release-scoring-config.entity';

export interface UpdateReleaseScoringConfigInput extends ReleaseScoringWeights {
  severityDeductions: ReleaseScoringConfigEntity['severityDeductions'];
  manualPassRateBlockThreshold: number;
  automationCoverageWarnThreshold: number;
}

export class UpdateReleaseScoringConfigCommand {
  constructor(
    public readonly organizationId: string,
    public readonly sprintId: string,
    public readonly input: UpdateReleaseScoringConfigInput,
  ) {}
}

const WEIGHT_SUM_TOLERANCE = 0.5;

@CommandHandler(UpdateReleaseScoringConfigCommand)
export class UpdateReleaseScoringConfigHandler
  implements ICommandHandler<UpdateReleaseScoringConfigCommand, ReleaseScoringConfigEntity>
{
  constructor(
    @Inject(RELEASE_METRICS_READ_REPOSITORY)
    private readonly metricsReadRepository: IReleaseMetricsReadRepository,
    @Inject(RELEASE_SCORING_CONFIG_REPOSITORY)
    private readonly scoringConfigRepository: IReleaseScoringConfigRepository,
  ) {}

  async execute(command: UpdateReleaseScoringConfigCommand): Promise<ReleaseScoringConfigEntity> {
    const ref = await this.metricsReadRepository.findSprintProjectRef(command.sprintId, command.organizationId);
    if (!ref) {
      throw new NotFoundException('Sprint not found');
    }

    const { input } = command;
    const weightSum =
      input.requirementCoverageWeight +
      input.testCaseCoverageWeight +
      input.manualExecutionWeight +
      input.automationExecutionWeight +
      input.bugRiskWeight;
    if (Math.abs(weightSum - 100) > WEIGHT_SUM_TOLERANCE) {
      throw new BadRequestException(`Scoring weights must sum to 100 (got ${weightSum}).`);
    }
    for (const severity of DEFECT_SEVERITIES) {
      const deduction = input.severityDeductions[severity];
      if (typeof deduction !== 'number' || deduction > 0) {
        throw new BadRequestException(`severityDeductions.${severity} must be a number <= 0.`);
      }
    }

    return this.scoringConfigRepository.upsert({ projectId: ref.projectId, ...input });
  }
}
