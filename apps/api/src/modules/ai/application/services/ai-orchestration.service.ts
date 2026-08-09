import { randomUUID } from 'crypto';
import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ZodType } from 'zod';
import { AI_PROVIDERS, AiCompletionResult, IAiProvider } from '../ports/ai-provider.port';
import {
  AGENT_REPOSITORY,
  IAgentRepository,
  AgentCatalogEntry,
  AGENT_RUN_REPOSITORY,
  IAgentRunRepository,
  AI_PROMPT_REPOSITORY,
  IAiPromptRepository,
  ActivePrompt,
  AI_RESPONSE_REPOSITORY,
  IAiResponseRepository,
  MODEL_REGISTRY_REPOSITORY,
  IModelRegistryRepository,
  ModelRegistryEntry,
} from '../../domain/repositories';
import { renderTemplate } from '../utils/prompt-template.util';
import { extractJson } from '../utils/json-extractor.util';
import { computeConfidence } from '../utils/confidence.util';
import { estimateCostUsd } from '../utils/model-pricing.util';
import { InProcessTtlCache } from '../utils/in-process-ttl-cache';
import { AiProviderConfigService, ResolvedAiConfig } from './ai-provider-config.service';

const SYSTEM_PROMPT =
  'You are an AI agent inside SprintGuard AI, an enterprise QA intelligence platform. ' +
  'Always respond with a single valid JSON object and nothing else -- no markdown code fences, ' +
  'no commentary before or after the JSON.';

// Default initial attempt + one repair retry (Solution Architecture §10.3); overridden per
// provider/module via ResolvedAiConfig.retryCount when an admin has configured one in AI Settings.
const DEFAULT_MAX_ATTEMPTS = 2;

// AiProviderConfig.maxOutputTokens is a single org-wide preference per provider, but capabilities
// have wildly different output sizes -- a value an admin raises so full-file automation generation
// doesn't get truncated (e.g. 20000) silently gets inherited by every lightweight capability
// sharing that provider (test-case, test-scenario, ...) too. On tiers with a hard per-minute token
// ceiling well below that (e.g. Groq's on_demand tier: 12000 TPM total for prompt+completion on
// llama-3.3-70b-versatile), that single oversized request is rejected outright regardless of how
// small the actual prompt is -- exactly what happened here. Clamping the effective max_tokens per
// capability (not the DB value itself) lets an admin's preference still act as an upper bound for
// capabilities that need it, without breaking every other capability on the same provider.
const LARGE_OUTPUT_CAPABILITIES = new Set([
  'playwright-api-automation',
  'playwright-ui-automation',
  'deep-requirement-analysis',
  'test-case-improvement',
]);
const DEFAULT_MAX_TOKENS_CEILING = 4096;
const LARGE_OUTPUT_MAX_TOKENS_CEILING = 8000;

function clampMaxTokens(capability: string, configuredMaxTokens: number | undefined): number | undefined {
  if (configuredMaxTokens === undefined) return undefined;
  const ceiling = LARGE_OUTPUT_CAPABILITIES.has(capability) ? LARGE_OUTPUT_MAX_TOKENS_CEILING : DEFAULT_MAX_TOKENS_CEILING;
  return Math.min(configuredMaxTokens, ceiling);
}

// Same LARGE_OUTPUT_CAPABILITIES set as above, applied as a *floor* rather than a ceiling: these are
// the same capabilities allowed to generate up to LARGE_OUTPUT_MAX_TOKENS_CEILING tokens of
// structured output, so a short org-configured timeout (e.g. this account's Groq AiProviderConfig,
// which is 30000ms -- set with lighter capabilities in mind) can cut off a call that was always going
// to take longer, not one that's actually stuck. DEFAULT_TIMEOUT_MS closes a separate gap: when
// neither ModuleAiConfig nor AiProviderConfig has timeoutMs set at all, withTimeout() previously
// applied no timeout whatsoever, silently inheriting the underlying SDK's own 600000ms (10 minute)
// default -- this ensures every call is bounded by something sane even on a totally unconfigured
// provider/capability combination.
const LARGE_OUTPUT_TIMEOUT_FLOOR_MS = 90000;
const DEFAULT_TIMEOUT_MS = 60000;

function clampTimeout(capability: string, configuredTimeoutMs: number | undefined): number {
  if (configuredTimeoutMs === undefined) return DEFAULT_TIMEOUT_MS;
  const floor = LARGE_OUTPUT_CAPABILITIES.has(capability) ? LARGE_OUTPUT_TIMEOUT_FLOOR_MS : 0;
  return Math.max(configuredTimeoutMs, floor);
}

export interface ExecuteAgentParams<T> {
  capability: string;
  agentKey: string;
  organizationId: string;
  variables: Record<string, unknown>;
  // Input/Def left as `any` (not tied to T) so schemas using .default() -- whose parsed Input and
  // Output types legitimately differ -- can be passed without a spurious structural mismatch.
  outputSchema: ZodType<T, any, any>;
  // Left unset, a random id is generated and no dedup check runs (today's default behavior for most
  // callers). Callers that want double-click/concurrent-retry protection pass a key that's STABLE
  // across repeat calls for "the same operation" (e.g. `deep-requirement-analysis:${storyId}`) --
  // execute() then rejects a new call outright while an earlier call with that same key is still
  // PENDING/RUNNING, instead of racing it. See IAgentRunRepository.findActiveByCorrelationId.
  correlationId?: string;
  provider?: string;
  // Prompt Management Playground: test a specific prompt version (any status, not just the
  // capability's active one) instead of looking it up by capability. Everything else -- retry,
  // fallback, persistence -- runs identically, so a playground test reflects real behavior.
  promptOverride?: string;
}

export interface ExecuteAgentResult<T> {
  data: T;
  confidenceScore: number;
  agentRunId: string;
  provider: string;
  model: string;
  promptVersion: string;
}

interface AttemptOutcome<T> {
  data: T;
  confidenceScore: number;
  rawText: string;
  tokensUsed: number;
  latencyMs: number;
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number | undefined): Promise<T> {
  if (!timeoutMs) return promise;
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`AI provider call timed out after ${timeoutMs}ms`)), timeoutMs),
    ),
  ]);
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Short pause before retrying a *provider-level* failure (timeout/network/5xx/429) -- politer to a
// possibly-still-struggling or rate-limited provider than an immediate hammer, without meaningfully
// slowing down the common case (this never delays a validation-repair retry, see runAttempts below).
const TRANSIENT_RETRY_BACKOFF_MS = 500;

type AttemptFailureKind = 'auth' | 'config' | 'rate_limit' | 'transient';

// Every provider adapter here (groq/openai/gemini/openrouter via the `openai` SDK, anthropic via
// `@anthropic-ai/sdk`) throws an error with a numeric `.status` set to the HTTP response code on
// API failures -- and so does Nest's own HttpException (e.g. InternalServerErrorException, which
// getClient() throws synchronously for a missing API key before any HTTP call happens). That
// second case is the one `.status` alone can't disambiguate from a genuine provider 5xx (both read
// as 500), so it's checked by class first.
function extractStatus(error: unknown): number | undefined {
  if (error && typeof error === 'object' && 'status' in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === 'number') return status;
  }
  return undefined;
}

// Prompt/agent/model-registry rows are re-read on every single execute() call but change rarely --
// an admin editing AI Settings or activating a new prompt version, not every request. A short TTL
// (rather than an unbounded cache) bounds how long a stale read can persist without any invalidation
// wiring at all; the capability/id-keyed caches below are invalidated eagerly on the specific
// mutations that can make them stale (see invalidatePromptCapabilityCache/invalidatePromptByIdCache).
const REFERENCE_DATA_CACHE_TTL_MS = 60_000;

function classifyAttemptFailure(error: unknown): { kind: AttemptFailureKind; message: string } {
  const message = error instanceof Error ? error.message : String(error);

  // Thrown by us (missing/misconfigured API key), never by a provider SDK -- retrying with the same
  // credentials can't succeed, same as an auth failure.
  if (error instanceof InternalServerErrorException) {
    return { kind: 'config', message };
  }

  const status = extractStatus(error);
  if (status === 401 || status === 403) return { kind: 'auth', message };
  if (status === 429) return { kind: 'rate_limit', message };
  // Anything else that reached here -- a genuine 5xx, withTimeout's own timeout Error, a raw network
  // error with no status at all -- is presumed transient and worth a backed-off retry.
  return { kind: 'transient', message };
}

// Application-layer service (Solution Architecture §16.1) -- the only thing any agent-executing
// module (requirement-intelligence, test-intelligence, ...) depends on. Encapsulates provider
// selection, prompt rendering, schema validation + repair retry, confidence scoring, and
// AgentRun/AiResponse persistence so no consumer module touches an LLM SDK or Prisma directly.
//
// Provider/model/parameters/fallback are resolved per-call via AiProviderConfigService against
// each org's AI Settings config (AiProviderConfig/ModuleAiConfig) -- callers only ever specify a
// capability, never a hardcoded model, so changing a module's model in AI Settings takes effect
// immediately with no code change or redeploy.
@Injectable()
export class AiOrchestrationService {
  // One cache instance per @Injectable() singleton -- correct as-is since Nest gives this service
  // exactly one instance per running application (per warm serverless invocation context here).
  private readonly promptByCapabilityCache = new InProcessTtlCache<ActivePrompt | null>(REFERENCE_DATA_CACHE_TTL_MS);
  private readonly promptByIdCache = new InProcessTtlCache<ActivePrompt | null>(REFERENCE_DATA_CACHE_TTL_MS);
  private readonly agentByKeyCache = new InProcessTtlCache<AgentCatalogEntry | null>(REFERENCE_DATA_CACHE_TTL_MS);
  private readonly modelRegistryCache = new InProcessTtlCache<ModelRegistryEntry | null>(REFERENCE_DATA_CACHE_TTL_MS);

  constructor(
    @Inject(AI_PROVIDERS) private readonly providers: IAiProvider[],
    @Inject(AGENT_REPOSITORY) private readonly agentRepository: IAgentRepository,
    @Inject(AGENT_RUN_REPOSITORY) private readonly agentRunRepository: IAgentRunRepository,
    @Inject(AI_PROMPT_REPOSITORY) private readonly promptRepository: IAiPromptRepository,
    @Inject(AI_RESPONSE_REPOSITORY) private readonly responseRepository: IAiResponseRepository,
    @Inject(MODEL_REGISTRY_REPOSITORY) private readonly modelRegistryRepository: IModelRegistryRepository,
    private readonly aiProviderConfigService: AiProviderConfigService,
  ) {}

  // Called by Prompt Management's ActivatePromptHandler after activate() succeeds -- the newly
  // activated version must be visible to the very next execute() call for this capability, not up
  // to REFERENCE_DATA_CACHE_TTL_MS later.
  invalidatePromptCapabilityCache(capability: string): void {
    this.promptByCapabilityCache.delete(capability);
  }

  // Called by Prompt Management's UpdatePromptDraftHandler/DeletePromptHandler -- both change what
  // findById(promptId) would return (a DRAFT's template, or the row's existence) for an id the
  // Prompt Playground may have already cached via promptOverride.
  invalidatePromptByIdCache(promptId: string): void {
    this.promptByIdCache.delete(promptId);
  }

  async execute<T>(params: ExecuteAgentParams<T>): Promise<ExecuteAgentResult<T>> {
    const correlationId = params.correlationId ?? randomUUID();

    // Request deduplication guard -- only runs when the caller opted in with a stable correlationId.
    // A freshly randomUUID()'d correlationId can never collide with a prior run, so skipping the
    // query in that case is both correct and avoids an extra DB round trip for every call that
    // hasn't been wired for dedup yet.
    if (params.correlationId) {
      const active = await this.agentRunRepository.findActiveByCorrelationId(params.organizationId, params.correlationId);
      if (active) {
        throw new ConflictException(
          `This operation is already in progress (started ${active.startedAt.toISOString()}). Please wait for it to finish before retrying.`,
        );
      }
    }

    const resolved = await this.aiProviderConfigService.resolveEffectiveConfig(
      params.organizationId,
      params.capability,
      params.provider,
    );
    // AiProviderConfigService already falls back to ai.defaultProvider when nothing is configured
    // in the DB -- keeps every unmigrated org working exactly as before this feature existed.
    const provider = resolved.provider;
    const effective: ResolvedAiConfig = {
      ...resolved,
      maxTokens: clampMaxTokens(params.capability, resolved.maxTokens),
      timeoutMs: clampTimeout(params.capability, resolved.timeoutMs),
    };

    const [prompt, agent] = await Promise.all([
      params.promptOverride
        ? this.getCachedPromptById(params.promptOverride)
        : this.getCachedActivePromptByCapability(params.capability),
      this.getCachedAgentByKey(params.agentKey),
    ]);

    if (!prompt) {
      throw new NotFoundException(
        params.promptOverride
          ? `Prompt "${params.promptOverride}" not found`
          : `No active prompt for capability "${params.capability}"`,
      );
    }
    if (!agent) {
      throw new NotFoundException(`Unknown agent "${params.agentKey}". Run \`pnpm db:seed\`.`);
    }

    const explicitModel = effective.model;
    let model: string;
    let modelRegistryEntryId: string | undefined;
    if (explicitModel) {
      model = explicitModel;
      modelRegistryEntryId = undefined;
    } else {
      const registryEntry = await this.resolveModelRegistryEntry(provider, params.capability);
      model = registryEntry.model;
      modelRegistryEntryId = registryEntry.id;
    }

    const providerImpl = this.findProvider(provider);

    const agentRun = await this.agentRunRepository.start({
      agentId: agent.id,
      organizationId: params.organizationId,
      correlationId,
      input: params.variables,
      provider,
      model,
    });

    const renderedPrompt = renderTemplate(prompt.template, params.variables);
    const maxAttempts = effective.retryCount ?? DEFAULT_MAX_ATTEMPTS;

    const primary = await this.runAttempts({
      providerImpl,
      model,
      config: effective,
      renderedPrompt,
      outputSchema: params.outputSchema,
      maxAttempts,
    });

    if (primary.outcome) {
      return this.persistSuccess({
        outcome: primary.outcome,
        agentRun,
        prompt,
        modelRegistryEntryId,
        provider,
        model,
      });
    }

    // Fallback (AI Settings §12): only attempted once, and only when the org configured one --
    // absent a fallback this preserves the original behavior of flagging the run for review after
    // the primary provider exhausts its retries.
    if (effective.fallbackProvider && effective.fallbackModel) {
      const fallbackApiKey = await this.aiProviderConfigService.resolveApiKey(
        params.organizationId,
        effective.fallbackProvider,
      );
      const fallbackProviderImpl = this.findProvider(effective.fallbackProvider);
      const fallback = await this.runAttempts({
        providerImpl: fallbackProviderImpl,
        model: effective.fallbackModel,
        config: { ...effective, apiKey: fallbackApiKey },
        renderedPrompt,
        outputSchema: params.outputSchema,
        maxAttempts: 1,
      });

      if (fallback.outcome) {
        return this.persistSuccess({
          outcome: fallback.outcome,
          agentRun,
          prompt,
          modelRegistryEntryId: undefined,
          provider: effective.fallbackProvider,
          model: effective.fallbackModel,
        });
      }

      await this.agentRunRepository.complete({
        id: agentRun.id,
        status: 'FLAGGED_FOR_REVIEW',
        error: `Primary provider failed: ${primary.lastError}; fallback provider failed: ${fallback.lastError}`,
      });
      throw new UnprocessableEntityException(
        `AI agent "${params.agentKey}" failed on both primary and fallback providers: ${fallback.lastError}`,
      );
    }

    await this.agentRunRepository.complete({
      id: agentRun.id,
      status: 'FLAGGED_FOR_REVIEW',
      error: primary.lastError,
    });
    throw new UnprocessableEntityException(
      `AI agent "${params.agentKey}" output failed validation after retry: ${primary.lastError}`,
    );
  }

  private findProvider(providerKey: string): IAiProvider {
    const providerImpl = this.providers.find((p) => p.key === providerKey);
    if (!providerImpl) {
      throw new NotFoundException(`No connector registered for provider "${providerKey}"`);
    }
    return providerImpl;
  }

  private async getCachedActivePromptByCapability(capability: string): Promise<ActivePrompt | null> {
    const cached = this.promptByCapabilityCache.get(capability);
    if (cached !== undefined) return cached;
    const prompt = await this.promptRepository.findActiveByCapability(capability);
    this.promptByCapabilityCache.set(capability, prompt);
    return prompt;
  }

  private async getCachedPromptById(id: string): Promise<ActivePrompt | null> {
    const cached = this.promptByIdCache.get(id);
    if (cached !== undefined) return cached;
    const prompt = await this.promptRepository.findById(id);
    this.promptByIdCache.set(id, prompt);
    return prompt;
  }

  private async getCachedAgentByKey(key: string): Promise<AgentCatalogEntry | null> {
    const cached = this.agentByKeyCache.get(key);
    if (cached !== undefined) return cached;
    const agent = await this.agentRepository.findByKey(key);
    this.agentByKeyCache.set(key, agent);
    return agent;
  }

  // Single lookup reused for both the model string and the registry entry id -- these used to be
  // two separate methods (resolveRegistryModel/registryEntryId) called back-to-back with identical
  // arguments, issuing the same findActiveForCapability query twice per execute() call. No cache
  // invalidation wiring exists for this one -- ModelRegistryEntry rows are seed/admin data with no
  // mutation command anywhere in the app, so nothing running can make a cached entry stale.
  private async resolveModelRegistryEntry(
    provider: string,
    capability: string,
  ): Promise<{ id: string; model: string }> {
    const cacheKey = `${provider}:${capability}`;
    const cached = this.modelRegistryCache.get(cacheKey);
    const modelEntry = cached !== undefined ? cached : await this.modelRegistryRepository.findActiveForCapability(provider, capability);
    if (cached === undefined) {
      this.modelRegistryCache.set(cacheKey, modelEntry);
    }
    if (!modelEntry) {
      throw new NotFoundException(`No active model registered for provider "${provider}" and capability "${capability}"`);
    }
    return { id: modelEntry.id, model: modelEntry.model };
  }

  private async runAttempts<T>(args: {
    providerImpl: IAiProvider;
    model: string;
    config: ResolvedAiConfig;
    renderedPrompt: string;
    outputSchema: ZodType<T, any, any>;
    maxAttempts: number;
  }): Promise<{ outcome: AttemptOutcome<T> | null; lastError: string }> {
    const { providerImpl, model, config, renderedPrompt, outputSchema, maxAttempts } = args;
    let lastError = '';
    // Only a schema/JSON-extraction failure means the model actually responded, just not with valid
    // output -- that's the one case a "your previous response was invalid, return corrected JSON"
    // repair prompt is honest and useful. A provider-level failure (timeout/network/5xx/429) means
    // the model never got a chance to respond at all, so retrying re-sends the ORIGINAL prompt
    // unchanged; telling it its (nonexistent) JSON was wrong would just be misleading.
    let lastFailureWasValidation = false;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0 && !lastFailureWasValidation) {
        await delay(TRANSIENT_RETRY_BACKOFF_MS);
      }

      const userPrompt =
        attempt > 0 && lastFailureWasValidation
          ? `${renderedPrompt}\n\nYour previous response was invalid: ${lastError}\nReturn ONLY corrected, valid JSON.`
          : renderedPrompt;

      const startedAt = Date.now();
      let completion: AiCompletionResult;

      try {
        completion = await withTimeout(
          providerImpl.complete(
            {
              systemPrompt: SYSTEM_PROMPT,
              prompt: userPrompt,
              apiKey: config.apiKey,
              temperature: config.temperature,
              topP: config.topP,
              topK: config.topK,
              maxTokens: config.maxTokens,
            },
            model,
          ),
          config.timeoutMs,
        );
      } catch (error) {
        const classified = classifyAttemptFailure(error);
        lastError = classified.message;
        lastFailureWasValidation = false;

        // Retrying with the same bad credentials (or a provider that just told us we're not
        // authorized) can't succeed -- stop now instead of burning the remaining attempts (and, for
        // a real auth failure, more of the org's rate-limit budget) on a call guaranteed to fail the
        // same way every time.
        if (classified.kind === 'auth' || classified.kind === 'config') {
          break;
        }
        continue;
      }

      const rawText = completion.text;
      const tokensUsed = completion.inputTokens + completion.outputTokens;

      try {
        const json = extractJson(rawText);
        const parsed = outputSchema.safeParse(json);

        if (parsed.success) {
          return {
            outcome: {
              data: parsed.data,
              confidenceScore: computeConfidence(attempt),
              rawText,
              tokensUsed,
              latencyMs: Date.now() - startedAt,
            },
            lastError: '',
          };
        }

        lastError = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
      }
      lastFailureWasValidation = true;
    }

    return { outcome: null, lastError };
  }

  private async persistSuccess<T>(args: {
    outcome: AttemptOutcome<T>;
    agentRun: { id: string };
    prompt: { id: string; version: string; templateHash: string };
    modelRegistryEntryId: string | undefined;
    provider: string;
    model: string;
  }): Promise<ExecuteAgentResult<T>> {
    const { outcome, agentRun, prompt, modelRegistryEntryId, provider, model } = args;
    const costUsd = estimateCostUsd(model, outcome.tokensUsed);

    await this.responseRepository.create({
      agentRunId: agentRun.id,
      promptId: prompt.id,
      modelRegistryEntryId,
      promptVersion: prompt.version,
      promptHash: prompt.templateHash,
      rawResponse: { text: outcome.rawText },
      parsedResponse: outcome.data as object,
      confidenceScore: outcome.confidenceScore,
      tokensUsed: outcome.tokensUsed,
      latencyMs: outcome.latencyMs,
      costUsd,
    });
    await this.agentRunRepository.complete({
      id: agentRun.id,
      status: 'SUCCEEDED',
      output: outcome.data as object,
      confidenceScore: outcome.confidenceScore,
      tokensUsed: outcome.tokensUsed,
      costUsd,
      provider,
      model,
    });

    return {
      data: outcome.data,
      confidenceScore: outcome.confidenceScore,
      agentRunId: agentRun.id,
      provider,
      model,
      promptVersion: prompt.version,
    };
  }
}
