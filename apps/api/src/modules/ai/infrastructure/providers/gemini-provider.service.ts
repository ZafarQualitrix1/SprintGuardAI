import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

@Injectable()
export class GeminiProviderService implements IAiProvider {
  readonly key = 'google';
  private client: GoogleGenerativeAI | null = null;

  constructor(private readonly configService: ConfigService) {}

  private getClient(): GoogleGenerativeAI {
    if (this.client) return this.client;
    const apiKey = this.configService.get<string>('ai.googleApiKey');
    if (!apiKey) {
      throw new InternalServerErrorException('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }
    this.client = new GoogleGenerativeAI(apiKey);
    return this.client;
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const generativeModel = this.getClient().getGenerativeModel({
      model,
      systemInstruction: request.systemPrompt,
    });

    const result = await generativeModel.generateContent(request.prompt);
    const response = result.response;

    return {
      text: response.text(),
      inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
      outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
    };
  }
}
