-- AI Settings Control Center: DB-backed provider credential storage (replacing env-var-only
-- config) + per-module AI overrides consumed by AiOrchestrationService. Purely additive -- no
-- existing tables or columns altered. Hand-written (see 20260731000000_add_integration_connection_center
-- for precedent) since `prisma migrate dev` requires an interactive shadow-database session.
-- Reuses the "HealthStatus" enum already created by that same prior migration.

-- CreateTable
CREATE TABLE "AiProviderConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "apiKeyEncrypted" TEXT,
    "defaultModel" TEXT,
    "projectId" TEXT,
    "region" TEXT,
    "timeoutMs" INTEGER DEFAULT 30000,
    "retryCount" INTEGER DEFAULT 2,
    "temperature" DOUBLE PRECISION DEFAULT 0.7,
    "topP" DOUBLE PRECISION,
    "topK" INTEGER,
    "maxOutputTokens" INTEGER,
    "streaming" BOOLEAN NOT NULL DEFAULT false,
    "safetySettings" JSONB,
    "fallbackProvider" TEXT,
    "fallbackModel" TEXT,
    "healthStatus" "HealthStatus" NOT NULL DEFAULT 'UNKNOWN',
    "lastConnectedAt" TIMESTAMP(3),
    "lastTestLatencyMs" INTEGER,
    "lastTestError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiProviderConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiProviderConfig_organizationId_provider_key" ON "AiProviderConfig"("organizationId", "provider");

-- AddForeignKey
ALTER TABLE "AiProviderConfig" ADD CONSTRAINT "AiProviderConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "ModuleAiConfig" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "capability" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "provider" TEXT,
    "model" TEXT,
    "temperature" DOUBLE PRECISION,
    "maxTokens" INTEGER,
    "retryCount" INTEGER,
    "timeoutMs" INTEGER,
    "streaming" BOOLEAN,
    "fallbackProvider" TEXT,
    "fallbackModel" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModuleAiConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ModuleAiConfig_organizationId_capability_key" ON "ModuleAiConfig"("organizationId", "capability");

-- AddForeignKey
ALTER TABLE "ModuleAiConfig" ADD CONSTRAINT "ModuleAiConfig_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
