-- Row-Level Security policies (docs/architecture/02-database-design.md §9).
-- Run after `prisma migrate deploy` (not managed by Prisma migrations directly).
--
-- Applied only to tables carrying `organizationId` directly. Child tables that are tenant-scoped
-- transitively through a parent FK (e.g. Story -> Sprint -> Project -> Organization) are protected
-- by (a) the application-level TenantScopedRepository filter on the parent lookup, and (b) the
-- parent row's own RLS policy already preventing cross-tenant parent rows from being visible in
-- the first place -- a child row can never be reached without first resolving its tenant-scoped
-- parent.
--
-- Session variable `app.current_org_id` is set per-transaction via PrismaService.withTenant()
-- (packages/database/src/prisma.service.ts) using `SET LOCAL`.

DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'Organization', -- self-referential: id = current org id
    'Membership',
    'ApiKey',
    'Project',
    'AgentRun',
    'AiUsageMetric',
    'AiIncident',
    'KnowledgeNode',
    'DocumentAsset',
    'IntegrationConnection',
    'FeatureFlagOverride',
    'PluginInstallation',
    'WorkflowDefinition',
    'Subscription',
    'UsageQuota',
    'TenantBranding',
    'NotificationEvent',
    'AuditLog'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tenant_table);
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', tenant_table);
  END LOOP;
END $$;

-- Organization is keyed by its own `id`, not `organizationId`.
DROP POLICY IF EXISTS organization_tenant_isolation ON "Organization";
CREATE POLICY organization_tenant_isolation ON "Organization"
  USING ("id" = current_setting('app.current_org_id', true));

-- Every other directly-scoped table shares the same shape.
DO $$
DECLARE
  tenant_table text;
BEGIN
  FOREACH tenant_table IN ARRAY ARRAY[
    'Membership', 'ApiKey', 'Project', 'AgentRun', 'AiUsageMetric', 'AiIncident',
    'KnowledgeNode', 'DocumentAsset', 'IntegrationConnection', 'FeatureFlagOverride',
    'PluginInstallation', 'WorkflowDefinition', 'Subscription', 'UsageQuota', 'TenantBranding',
    'NotificationEvent', 'AuditLog'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', tenant_table || '_tenant_isolation', tenant_table);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING ("organizationId" = current_setting(''app.current_org_id'', true))',
      tenant_table || '_tenant_isolation',
      tenant_table
    );
  END LOOP;
END $$;

-- `Agent` is a shared catalog (isBuiltIn = true entries have no natural organizationId); the
-- schema models it without organizationId today (see schema.prisma), so it is intentionally
-- excluded from the loop above pending the org-scoped custom-agent feature. Remove this comment
-- once Agent gains an organizationId column for tenant-authored custom agents.
