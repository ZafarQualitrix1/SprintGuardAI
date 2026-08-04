import { Inject, NotFoundException } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  TEST_SCENARIO_REPOSITORY,
  ITestScenarioRepository,
} from '../../domain/repositories/test-scenario.repository.interface';
import {
  STORY_METADATA_READ_REPOSITORY,
  IStoryMetadataReadRepository,
} from '../../domain/repositories/story-metadata-read.repository.interface';
import { TestCaseExportFormat, TestCaseExportService } from '../services/test-case-export.service';

export interface TestCaseExportResult {
  filename: string;
  contentType: string;
  body: Buffer | string;
}

export class ExportTestCasesQuery {
  constructor(
    public readonly organizationId: string,
    public readonly storyId: string,
    public readonly format: TestCaseExportFormat,
  ) {}
}

const CONTENT_TYPES: Record<TestCaseExportFormat, string> = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  csv: 'text/csv',
};

@QueryHandler(ExportTestCasesQuery)
export class ExportTestCasesHandler implements IQueryHandler<ExportTestCasesQuery, TestCaseExportResult> {
  constructor(
    @Inject(TEST_SCENARIO_REPOSITORY) private readonly testScenarioRepository: ITestScenarioRepository,
    @Inject(STORY_METADATA_READ_REPOSITORY) private readonly storyMetadataRepository: IStoryMetadataReadRepository,
    private readonly exportService: TestCaseExportService,
  ) {}

  async execute(query: ExportTestCasesQuery): Promise<TestCaseExportResult> {
    const story = await this.storyMetadataRepository.findById(query.storyId, query.organizationId);
    if (!story) {
      throw new NotFoundException('Story not found');
    }

    const scenarios = await this.testScenarioRepository.findByStoryId(query.storyId);
    const namePrefix = `${story.externalId ?? story.id}-test-cases`;

    const body =
      query.format === 'xlsx'
        ? this.exportService.buildWorkbook(scenarios, story)
        : this.exportService.buildCsv(scenarios);

    return {
      filename: `${namePrefix}.${query.format}`,
      contentType: CONTENT_TYPES[query.format],
      body,
    };
  }
}
