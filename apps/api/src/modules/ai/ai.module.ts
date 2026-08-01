import { Module } from '@nestjs/common';
import { AiController } from './presentation/ai.controller';

import { AiOrchestrationService } from './application/services/ai-orchestration.service';
import { AiProviderConfigService } from './application/services/ai-provider-config.service';
import { AI_PROVIDERS } from './application/ports/ai-provider.port';
import { CREDENTIAL_VAULT } from './application/ports/credential-vault.port';
import { AI_SETTINGS_COMMAND_HANDLERS } from './application/commands';
import { AI_SETTINGS_QUERY_HANDLERS } from './application/queries';
import {
  AGENT_REPOSITORY,
  AGENT_RUN_REPOSITORY,
  AI_PROMPT_REPOSITORY,
  AI_RESPONSE_REPOSITORY,
  MODEL_REGISTRY_REPOSITORY,
  AI_PROVIDER_CONFIG_REPOSITORY,
  MODULE_AI_CONFIG_REPOSITORY,
  AI_PROVIDER_STATS_REPOSITORY,
} from './domain/repositories';

import { ClaudeProviderService } from './infrastructure/providers/claude-provider.service';
import { OpenAiProviderService } from './infrastructure/providers/openai-provider.service';
import { GeminiProviderService } from './infrastructure/providers/gemini-provider.service';
import { AesCredentialVaultService } from './infrastructure/services/aes-credential-vault.service';
import { AiAuditLogService } from './infrastructure/services/ai-audit-log.service';
import {
  PrismaAgentRepository,
  PrismaAgentRunRepository,
  PrismaAiPromptRepository,
  PrismaAiResponseRepository,
  PrismaModelRegistryRepository,
  PrismaAiProviderConfigRepository,
  PrismaModuleAiConfigRepository,
  PrismaAiProviderStatsRepository,
} from './infrastructure/repositories';

// Bounded context module: AI Orchestration + AI Settings Control Center (Solution Architecture
// §6/§16). Provider-agnostic: requirement-intelligence/test-intelligence/coverage/release import
// this module and inject AiOrchestrationService -- they never touch an LLM SDK, the AiPrompt/
// AgentRun tables, or provider credentials directly. AiProviderConfig/ModuleAiConfig (this
// module's addition) let an admin change provider credentials/models/fallback per capability from
// AI Settings without a code change or redeploy.
@Module({
  controllers: [AiController],
  providers: [
    AiOrchestrationService,
    AiProviderConfigService,
    AiAuditLogService,
    ClaudeProviderService,
    OpenAiProviderService,
    GeminiProviderService,
    ...AI_SETTINGS_COMMAND_HANDLERS,
    ...AI_SETTINGS_QUERY_HANDLERS,
    {
      provide: AI_PROVIDERS,
      useFactory: (claude: ClaudeProviderService, openai: OpenAiProviderService, gemini: GeminiProviderService) => [
        claude,
        openai,
        gemini,
      ],
      inject: [ClaudeProviderService, OpenAiProviderService, GeminiProviderService],
    },
    { provide: CREDENTIAL_VAULT, useClass: AesCredentialVaultService },
    { provide: AGENT_REPOSITORY, useClass: PrismaAgentRepository },
    { provide: AGENT_RUN_REPOSITORY, useClass: PrismaAgentRunRepository },
    { provide: AI_PROMPT_REPOSITORY, useClass: PrismaAiPromptRepository },
    { provide: AI_RESPONSE_REPOSITORY, useClass: PrismaAiResponseRepository },
    { provide: MODEL_REGISTRY_REPOSITORY, useClass: PrismaModelRegistryRepository },
    { provide: AI_PROVIDER_CONFIG_REPOSITORY, useClass: PrismaAiProviderConfigRepository },
    { provide: MODULE_AI_CONFIG_REPOSITORY, useClass: PrismaModuleAiConfigRepository },
    { provide: AI_PROVIDER_STATS_REPOSITORY, useClass: PrismaAiProviderStatsRepository },
  ],
  exports: [AiOrchestrationService],
})
export class AiModule {}
