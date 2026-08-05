import { AutomationGenerationEntity } from '../domain/entities/automation-generation.entity';
import { AutomationCandidateResult } from '../application/queries/list-automation-candidates-by-sprint.query';
import { ApprovedApiAutomationCandidateResult } from '../application/queries/list-approved-api-automation-candidates.query';
import {
  ApprovedApiAutomationCandidateDto,
  AutomationCandidateDto,
  AutomationGenerationDetailDto,
  AutomationGenerationDto,
} from './dto/automation.dto';

export function toAutomationGenerationDto(entity: AutomationGenerationEntity): AutomationGenerationDto {
  return {
    id: entity.id,
    testCaseId: entity.testCaseId,
    automationType: entity.automationType,
    version: entity.version,
    status: entity.status,
    frameworkVersion: entity.frameworkVersion,
    generatorVersion: entity.generatorVersion,
    aiModelVersion: entity.aiModelVersion,
    automationReadinessScore: entity.automationReadinessScore,
    estimatedEffortHours: entity.estimatedEffortHours,
    complexityLevel: entity.complexityLevel,
    requiredPreconditions: entity.requiredPreconditions,
    missingRequirementDetails: entity.missingRequirementDetails,
    createdAt: entity.createdAt.toISOString(),
    isOutdated: entity.isOutdated,
  };
}

export function toAutomationGenerationDetailDto(entity: AutomationGenerationEntity): AutomationGenerationDetailDto {
  return { ...toAutomationGenerationDto(entity), files: entity.files };
}

export function toAutomationCandidateDto(result: AutomationCandidateResult): AutomationCandidateDto {
  return {
    testCaseId: result.testCase.id,
    testCaseTitle: result.testCase.title,
    storyId: result.testCase.storyId,
    storyTitle: result.testCase.storyTitle,
    priority: result.testCase.priority,
    testType: result.testCase.testType,
    automationStatus: result.testCase.automationStatus,
    automationType: result.testCase.automationType,
    apiEndpoint: result.testCase.apiEndpoint,
    uiScreen: result.testCase.uiScreen,
    latestApi: result.latestApi ? toAutomationGenerationDto(result.latestApi) : null,
    latestUi: result.latestUi ? toAutomationGenerationDto(result.latestUi) : null,
  };
}

export function toApprovedApiAutomationCandidateDto(
  result: ApprovedApiAutomationCandidateResult,
): ApprovedApiAutomationCandidateDto {
  return {
    testCaseId: result.testCase.id,
    displayId: result.testCase.displayId,
    testCaseTitle: result.testCase.title,
    storyId: result.testCase.storyId,
    storyExternalId: result.testCase.storyExternalId,
    storyTitle: result.testCase.storyTitle,
    apiEndpoint: result.testCase.apiEndpoint,
    requestMethod: result.testCase.requestMethod,
    priority: result.testCase.priority,
    automationStatus: result.testCase.automationStatus,
    createdAt: result.testCase.createdAt.toISOString(),
    updatedAt: result.testCase.updatedAt.toISOString(),
    latestGeneration: result.latestGeneration ? toAutomationGenerationDto(result.latestGeneration) : null,
  };
}
