import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;

@Injectable()
export class OpenAiProviderService implements IAiProvider {
  readonly key = 'openai';
  private client: OpenAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): OpenAI {
    if (this.client) return this.client;
    const apiKey = this.configService.get<string>('ai.openAiApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException('OPENAI_API_KEY is not configured');
    }
    this.client = new OpenAI({ apiKey });
    return this.client;
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const response = await this.getClient().chat.completions.create({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
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
