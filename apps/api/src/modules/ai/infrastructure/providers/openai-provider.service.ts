import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;

@Injectable()
export class OpenAiProviderService implements IAiProvider {
  readonly key = 'openai';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call, not cached -- request.apiKey may differ per org (see GeminiProviderService).
  private getClient(apiKey?: string): OpenAI {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.openAiApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }
    return new OpenAI({ apiKey: resolvedKey });
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
