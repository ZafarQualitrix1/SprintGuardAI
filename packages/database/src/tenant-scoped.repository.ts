/**
 * Base class for every tenant-scoped Infrastructure repository (Solution Architecture §8).
 *
 * Concrete repositories (implemented per bounded context, e.g.
 * `modules/sprint/infrastructure/repositories/prisma-sprint.repository.ts`) extend this and use
 * `this.organizationId` to merge `{ organizationId }` into every Prisma `where` clause -- making it
 * structurally impossible to omit the tenant filter. Combined with the Postgres RLS policies
 * (`PrismaService.withTenant`), tenant isolation is enforced at both the application and database
 * layers.
 */
export abstract class TenantScopedRepository {
  protected constructor(private readonly getOrganizationId: () => string) {}

  protected get organizationId(): string {
    return this.getOrganizationId();
  }

  /** Merges the current tenant into a Prisma `where` clause. */
  protected scoped<TWhere extends Record<string, unknown>>(
    where: TWhere = {} as TWhere,
  ): TWhere & { organizationId: string } {
    return { ...where, organizationId: this.organizationId };
  }
}
