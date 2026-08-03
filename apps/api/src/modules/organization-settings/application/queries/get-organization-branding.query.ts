import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '@sprintguard/database';

export interface OrganizationBranding {
  logoUrl: string | null;
  primaryColor: string | null;
}

export class GetOrganizationBrandingQuery {
  constructor(public readonly organizationId: string) {}
}

@QueryHandler(GetOrganizationBrandingQuery)
export class GetOrganizationBrandingHandler
  implements IQueryHandler<GetOrganizationBrandingQuery, OrganizationBranding>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetOrganizationBrandingQuery): Promise<OrganizationBranding> {
    const branding = await this.prisma.tenantBranding.findUnique({ where: { organizationId: query.organizationId } });
    return { logoUrl: branding?.logoUrl ?? null, primaryColor: branding?.primaryColor ?? null };
  }
}
