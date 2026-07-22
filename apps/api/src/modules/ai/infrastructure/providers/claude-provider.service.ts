import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

const DEFAULT_MAX_TOKENS = 4096;

@Injectable()
export class ClaudeProviderService implements IAiProvider {
  readonly key = 'anthropic';
  private client: Anthropic | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): Anthropic {
    if (this.client) return this.client;
    const apiKey = this.configService.get<string>('ai.anthropicApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException('ANTHROPIC_API_KEY is not configured');
    }
    this.client = new Anthropic({ apiKey });
    return this.client;
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const response = await this.getClient().messages.create({
      model,
      max_tokens: request.maxTokens ?? DEFAULT_MAX_TOKENS,
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
