import { ConfigService } from '@nestjs/config';
import { InternalServerErrorException } from '@nestjs/common';
import { OpenRouterProviderService } from './openrouter-provider.service';

const createMock = jest.fn();

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: { completions: { create: createMock } },
  }));
});

function buildProvider(apiKey: string | undefined) {
  const configService = { get: () => apiKey } as unknown as ConfigService;
  return new OpenRouterProviderService(configService);
}

describe('OpenRouterProviderService', () => {
  beforeEach(() => {
    createMock.mockReset();
  });

  it('throws when no API key is configured', async () => {
    const provider = buildProvider(undefined);
    await expect(
      provider.complete({ systemPrompt: 'sys', prompt: 'hi' }, 'openai/gpt-4o-mini'),
    ).rejects.toBeInstanceOf(InternalServerErrorException);
  });

  it('sends system/user messages and maps the response + usage', async () => {
    createMock.mockResolvedValue({
      choices: [{ message: { content: '{"ok":true}' } }],
      usage: { prompt_tokens: 12, completion_tokens: 34 },
    });
    const provider = buildProvider('fake-key');

    const result = await provider.complete(
      { systemPrompt: 'You are helpful.', prompt: 'Say hi' },
      'openai/gpt-4o-mini',
    );

    expect(createMock).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'openai/gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are helpful.' },
          { role: 'user', content: 'Say hi' },
        ],
      }),
    );
    expect(result).toEqual({ text: '{"ok":true}', inputTokens: 12, outputTokens: 34 });
  });

  it('defaults token counts and text to empty when usage/content is absent', async () => {
    createMock.mockResolvedValue({ choices: [{ message: {} }], usage: undefined });
    const provider = buildProvider('fake-key');

    const result = await provider.complete({ systemPrompt: 'sys', prompt: 'hi' }, 'openai/gpt-4o-mini');

    expect(result).toEqual({ text: '', inputTokens: 0, outputTokens: 0 });
  });
});
