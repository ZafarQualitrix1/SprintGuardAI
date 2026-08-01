import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { AiCompletionRequest, AiCompletionResult, IAiProvider } from '../../application/ports/ai-provider.port';

@Injectable()
export class GeminiProviderService implements IAiProvider {
  readonly key = 'google';

  constructor(private readonly configService: ConfigService) {}

  // Built per-call rather than cached -- request.apiKey may be a different org's DB-configured
  // key on each call, so a single cached singleton client would leak credentials across orgs.
  private getClient(apiKey?: string): GoogleGenerativeAI {
    const resolvedKey = apiKey ?? this.configService.get<string>('ai.googleApiKey');
    if (!resolvedKey) {
      throw new InternalServerErrorException('GOOGLE_GENERATIVE_AI_API_KEY is not configured');
    }
    return new GoogleGenerativeAI(resolvedKey);
  }

  async complete(request: AiCompletionRequest, model: string): Promise<AiCompletionResult> {
    const hasGenerationConfig =
      request.temperature !== undefined ||
      request.topP !== undefined ||
      request.topK !== undefined ||
      request.maxTokens !== undefined;

    const generativeModel = this.getClient(request.apiKey).getGenerativeModel({
      model,
      systemInstruction: request.systemPrompt,
      ...(hasGenerationConfig
        ? {
            generationConfig: {
              temperature: request.temperature,
              topP: request.topP,
              topK: request.topK,
              maxOutputTokens: request.maxTokens,
            },
          }
        : {}),
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
