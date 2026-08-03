import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/';

// Google's Gemini API exposes an OpenAI-compatible endpoint, same shortcut already used for
// Groq/OpenRouter -- avoids depending on @google/generative-ai directly (removed in 2801ff6).
// Model ids: e.g. "gemini-2.0-flash", "gemini-1.5-flash".
@Injectable()
export class GeminiProviderService implements IAiProvider {
  readonly key = 'google';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call, not cached -- request.apiKey may differ per org (see ClaudeProviderService).
  private getClient(apiKey?: string): OpenAI {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.geminiApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('GEMINI_API_KEY is not configured');
    }
    return new OpenAI({ apiKey: resolvedKey, baseURL: GEMINI_BASE_URL });
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
