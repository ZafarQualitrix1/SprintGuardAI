import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;
const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// Groq's API is OpenAI-compatible, so this reuses the `openai` SDK pointed at Groq's base URL
// rather than a bespoke client (same shortcut applies to Grok/DeepSeek/OpenRouter if added later).
@Injectable()
export class GroqProviderService implements IAiProvider {
  readonly key = 'groq';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call, not cached -- request.apiKey may differ per org (see ClaudeProviderService).
  private getClient(apiKey?: string): OpenAI {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.groqApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('GROQ_API_KEY is not configured');
    }
    return new OpenAI({ apiKey: resolvedKey, baseURL: GROQ_BASE_URL });
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
