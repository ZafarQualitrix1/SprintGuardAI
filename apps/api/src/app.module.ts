import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { DatabaseModule } from '@sprintguard/database';

import configuration from './config/configuration';
import { validateEnv } from './config/env.validation';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { PermissionsGuard } from './common/guards/permissions.guard';
import { HealthModule } from './health/health.module';

// Bounded context modules (Solution Architecture §6). Each implements Clean Architecture layering
// internally (docs/architecture/03-backend-folder-structure.md); this is the composition root.
import { IAMModule } from './modules/iam/iam.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SprintModule } from './modules/sprint/sprint.module';
import { RequirementIntelligenceModule } from './modules/requirement-intelligence/requirement-intelligence.module';
import { TestIntelligenceModule } from './modules/test-intelligence/test-intelligence.module';
import { ExecutionModule } from './modules/execution/execution.module';
import { CoverageModule } from './modules/coverage/coverage.module';
import { ReleaseModule } from './modules/release/release.module';
import { DefectModule } from './modules/defect/defect.module';
import { AgentsModule } from './modules/agents/agents.module';
import { AiModule } from './modules/ai/ai.module';
import { AiGovernanceModule } from './modules/ai-governance/ai-governance.module';
import { AiOpsModule } from './modules/ai-ops/ai-ops.module';
import { PromptManagementModule } from './modules/prompt-management/prompt-management.module';
import { KnowledgeModule } from './modules/knowledge/knowledge.module';
import { DocumentsModule } from './modules/documents/documents.module';
import { IntegrationModule } from './modules/integration/integration.module';
import { FeatureManagementModule } from './modules/feature-management/feature-management.module';
import { PluginsModule } from './modules/plugins/plugins.module';
import { WorkflowsModule } from './modules/workflows/workflows.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { PlatformSaasModule } from './modules/platform-saas/platform-saas.module';
import { PlatformModule } from './modules/platform/platform.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnv,
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.get<number>('throttle.ttl')! * 1000,
            limit: config.get<number>('throttle.limit')!,
          },
        ],
      }),
    }),
    JwtModule.registerAsync({
      global: true,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('auth.accessSecret'),
        signOptions: { expiresIn: config.get<string>('auth.accessTtl') },
      }),
    }),
    CqrsModule.forRoot(),
    DatabaseModule,
    HealthModule,

    IAMModule,
    AnalyticsModule,
    SprintModule,
    RequirementIntelligenceModule,
    TestIntelligenceModule,
    ExecutionModule,
    CoverageModule,
    ReleaseModule,
    DefectModule,
    AgentsModule,
    AiModule,
    AiGovernanceModule,
    AiOpsModule,
    PromptManagementModule,
    KnowledgeModule,
    DocumentsModule,
    IntegrationModule,
    FeatureManagementModule,
    PluginsModule,
    WorkflowsModule,
    RealtimeModule,
    PlatformSaasModule,
    PlatformModule,
  ],
  providers: [
    // Order matters: JwtAuthGuard (AuthN) runs before PermissionsGuard (AuthZ), matching
    // Solution Architecture §25.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
