import { AsyncLocalStorage } from 'async_hooks';

// Solution Architecture §8: request-scoped tenant context, populated by TenantContextMiddleware
// from the JWT's `orgId` claim. TenantScopedRepository (packages/database) reads this to append
// `WHERE organizationId = :tenantId` to every query -- impossible to forget per-query.
export interface TenantContextData {
  organizationId: string;
  userId?: string;
  correlationId?: string;
}

class TenantContextStore {
  private readonly storage = new AsyncLocalStorage<TenantContextData>();

  run<T>(context: TenantContextData, callback: () => T): T {
    return this.storage.run(context, callback);
  }

  get(): TenantContextData | undefined {
    return this.storage.getStore();
  }

  getOrganizationId(): string {
    const ctx = this.storage.getStore();
    if (!ctx?.organizationId) {
      throw new Error('TenantContext accessed outside of an authenticated request scope');
    }
    return ctx.organizationId;
  }
}

export const TenantContext = new TenantContextStore();
