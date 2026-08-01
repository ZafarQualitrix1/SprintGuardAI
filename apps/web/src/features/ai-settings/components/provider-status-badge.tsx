import { Badge } from '@/components/ui/badge';

export function providerHealthVariant(healthStatus: string): 'success' | 'warning' | 'destructive' | 'outline' {
  if (healthStatus === 'HEALTHY') return 'success';
  if (healthStatus === 'DEGRADED') return 'warning';
  if (healthStatus === 'UNHEALTHY') return 'destructive';
  return 'outline';
}

export function ProviderHealthBadge({ healthStatus }: { healthStatus: string }) {
  return <Badge variant={providerHealthVariant(healthStatus)}>{healthStatus}</Badge>;
}
