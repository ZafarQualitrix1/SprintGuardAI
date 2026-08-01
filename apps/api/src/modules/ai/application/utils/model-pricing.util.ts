// Static USD-per-1K-tokens pricing (published list prices, blended input/output rate for
// simplicity) -- computes a real costUsd from actual tokensUsed rather than leaving the schema's
// AgentRun/AiResponse.costUsd columns permanently empty. Unknown models (custom registry entries)
// simply don't get a cost estimate rather than a guessed one.
const PRICE_PER_1K_TOKENS_USD: Record<string, number> = {
  'llama-3.3-70b-versatile': 0.0007,
  'llama-3.1-8b-instant': 0.00007,
  'gemma2-9b-it': 0.0002,
  'gpt-4o': 0.0025,
  'gpt-4o-mini': 0.00015,
  'claude-sonnet-5': 0.003,
  'claude-opus-5': 0.015,
  'claude-haiku-4-5-20251001': 0.0008,
};

export function estimateCostUsd(model: string, tokensUsed: number): number | undefined {
  const pricePerToken = PRICE_PER_1K_TOKENS_USD[model];
  if (pricePerToken === undefined) return undefined;
  return Math.round(pricePerToken * (tokensUsed / 1000) * 1_000_000) / 1_000_000;
}
