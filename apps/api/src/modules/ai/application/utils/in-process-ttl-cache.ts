// Short-TTL, per-instance cache for reference data that's re-read on every AiOrchestrationService
// execute() call (active prompt per capability, agent per key, model-registry entry per
// provider+capability) but changes rarely -- an admin editing/activating a prompt, not every
// request. `undefined` always means "not cached" (a genuine cache miss), which is why every value
// type stored here is `V | null` rather than `V | undefined`: a cached "not found" (null) result is
// still a cache hit and must be distinguishable from never-having-looked-it-up.
//
// Deliberately in-process, not Redis-backed (Solution Architecture note: this deployment's
// REDIS_URL isn't always reachable, and these are indexed Postgres primary-key/unique lookups, not
// a proven bottleneck) -- gets most of the benefit within a warm serverless instance at zero new
// failure mode. A cold instance just pays one extra lookup per key, same as today.
export class InProcessTtlCache<V> {
  private readonly store = new Map<string, { value: V; expiresAt: number }>();

  constructor(private readonly ttlMs: number) {}

  get(key: string): V | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() >= entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: string, value: V): void {
    this.store.set(key, { value, expiresAt: Date.now() + this.ttlMs });
  }

  delete(key: string): void {
    this.store.delete(key);
  }
}
