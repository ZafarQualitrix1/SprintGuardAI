import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;

@Injectable()
export class ClaudeProviderService implements IAiProvider {
  readonly key = 'anthropic';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call, not cached -- request.apiKey may differ per org (see GroqProviderService).
  private getClient(apiKey?: string): Anthropic {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.anthropicApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }
    return new Anthropic({ apiKey: resolvedKey });
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const response = await this.getClient(request.apiKey).messages.create({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
      temperature: request.temperature,
      top_p: request.topP,
      top_k: request.topK,
      system: request.systemPrompt,
      messages: [{ role: 'user', content: request.prompt }],
    });

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n');

    return {
      text,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    };
  }
}
