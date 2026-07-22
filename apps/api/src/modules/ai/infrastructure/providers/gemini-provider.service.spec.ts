import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { GeminiProviderService } from './gemini-provider.service';

const generateContentMock = jest.fn();
const getGenerativeModelMock = jest.fn(() => ({ generateContent: generateContentMock }));

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: getGenerativeModelMock,
  })),
}));

function buildProvider(apiKey: string | undefined) {
  const configService = { get: () => apiKey } as unknown as ConfigService;
  return new GeminiProviderService(configService);
}

describe('GeminiProviderService', () => {
  beforeEach(() => {
    generateContentMock.mockReset();
    getGenerativeModelMock.mockClear();
  });

  it('throws when no API key is configured', async () => {
    const provider = buildProvider(undefined);
    await expect(provider.complete({ systemPrompt: 'sys', prompt: 'hi' }, 'gemini-2.0-flash')).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });

  it('passes systemInstruction/model and maps the response + usage metadata', async () => {
    generateContentMock.mockResolvedValue({
      response: {
        text: () => '{"ok":true}',
        usageMetadata: { promptTokenCount: 12, candidatesTokenCount: 34 },
      },
    });
    const provider = buildProvider('fake-key');

    const result = await provider.complete({ systemPrompt: 'You are helpful.', prompt: 'Say hi' }, 'gemini-2.0-flash');

    expect(getGenerativeModelMock).toHaveBeenCalledWith({
      model: 'gemini-2.0-flash',
      systemInstruction: 'You are helpful.',
    });
    expect(generateContentMock).toHaveBeenCalledWith('Say hi');
    expect(result).toEqual({ text: '{"ok":true}', inputTokens: 12, outputTokens: 34 });
  });

  it('defaults token counts to 0 when usage metadata is absent', async () => {
    generateContentMock.mockResolvedValue({ response: { text: () => 'plain text', usageMetadata: undefined } });
    const provider = buildProvider('fake-key');

    const result = await provider.complete({ systemPrompt: 'sys', prompt: 'hi' }, 'gemini-2.0-flash');

    expect(result).toEqual({ text: 'plain text', inputTokens: 0, outputTokens: 0 });
  });
});
