import { Module } from '@nestjs/common';
import { AiController } from './presentation/ai.controller';

import { AiOrchestrationService } from './application/services/ai-orchestration.service';
import { AI_PROVIDERS } from './application/ports/ai-provider.port';
import {
  AGENT_REPOSITORY,
  AGENT_RUN_REPOSITORY,
  AI_PROMPT_REPOSITORY,
  AI_RESPONSE_REPOSITORY,
  MODEL_REGISTRY_REPOSITORY,
} from './domain/repositories';

import { ClaudeProviderService } from './infrastructure/providers/claude-provider.service';
import { OpenAiProviderService } from './infrastructure/providers/openai-provider.service';
import { GeminiProviderService } from './infrastructure/providers/gemini-provider.service';
import {
  PrismaAgentRepository,
  PrismaAgentRunRepository,
  PrismaAiPromptRepository,
  PrismaAiResponseRepository,
  PrismaModelRegistryRepository,
} from './infrastructure/repositories';

// Bounded context module: AI Orchestration (Solution Architecture §6/§16). Provider-agnostic:
// requirement-intelligence/test-intelligence import this module and inject AiOrchestrationService
// -- they never touch an LLM SDK or the AiPrompt/AgentRun tables directly.
@Module({
  controllers: [AiController],
  providers: [
    AiOrchestrationService,
    ClaudeProviderService,
    OpenAiProviderService,
    GeminiProviderService,
    {
      provide: AI_PROVIDERS,
      useFactory: (claude: ClaudeProviderService, openai: OpenAiProviderService, gemini: GeminiProviderService) => [
        claude,
        openai,
        gemini,
      ],
      inject: [ClaudeProviderService, OpenAiProviderService, GeminiProviderService],
    },
    { provide: AGENT_REPOSITORY, useClass: PrismaAgentRepository },
    { provide: AGENT_RUN_REPOSITORY, useClass: PrismaAgentRunRepository },
    { provide: AI_PROMPT_REPOSITORY, useClass: PrismaAiPromptRepository },
    { provide: AI_RESPONSE_REPOSITORY, useClass: PrismaAiResponseRepository },
    { provide: MODEL_REGISTRY_REPOSITORY, useClass: PrismaModelRegistryRepository },
  ],
  exports: [AiOrchestrationService],
})
export class AiModule {}
