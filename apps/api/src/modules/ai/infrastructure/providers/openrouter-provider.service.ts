import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// OpenRouter's API is OpenAI-compatible, same shortcut as GroqProviderService. Models are
// addressed as "<upstream-provider>/<model>", e.g. "openai/gpt-4o-mini" or "anthropic/claude-3.5-sonnet".
@Injectable()
export class OpenRouterProviderService implements IAiProvider {
  readonly key = 'openrouter';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call, not cached -- request.apiKey may differ per org (see ClaudeProviderService).
  private getClient(apiKey?: string): OpenAI {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.openRouterApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('OPENROUTER_API_KEY is not configured');
    }
    return new OpenAI({
      apiKey: resolvedKey,
      baseURL: OPENROUTER_BASE_URL,
      // OpenRouter-recommended attribution headers (optional, used for their public leaderboard).
      defaultHeaders: {
        'HTTP-Referer': this.configService.get<string>('app.url') ?? 'https://sprintguard.ai',
        'X-Title': 'SprintGuard AI',
      },
    });
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const response = await this.getClient(request.apiKey).chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: request.temperature,
      top_p: request.topP,
      messages: [
        { role: 'system', content: request.systemPrompt },
        { role: 'user', content: request.prompt },
      ],
    });

    return {
      text: response.choices[0]?.message?.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    };
  }
}
