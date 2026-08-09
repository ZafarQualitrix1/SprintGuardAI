-- Observability: AgentRun.retryCount (attempts consumed beyond the first), AgentRun.validationStatus
-- (PASSED_FIRST_TRY | PASSED_AFTER_REPAIR | FAILED_VALIDATION | FAILED_PROVIDER_ERROR, free-form text
-- not a DB enum so new classifications don't need a migration), and AiResponse.inputTokens /
-- AiResponse.outputTokens (split out of the existing tokensUsed sum).
ALTER TABLE "AgentRun" ADD COLUMN "retryCount" INTEGER;
ALTER TABLE "AgentRun" ADD COLUMN "validationStatus" TEXT;

ALTER TABLE "AiResponse" ADD COLUMN "inputTokens" INTEGER;
ALTER TABLE "AiResponse" ADD COLUMN "outputTokens" INTEGER;
