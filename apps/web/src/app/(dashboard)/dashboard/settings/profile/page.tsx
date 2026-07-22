import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent } from '@/components/ui/card';

// Scaffold only -- data fetching and feature components are wired up in a later implementation
// step (docs/architecture build sequence). Establishes routing, layout, and title for this page.
export default function Page() {
  return (
    <div>
      <PageHeader title="Profile" description="Your account details and preferences." />
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Coming soon.
        </CardContent>
      </Card>
    </div>
  );
}
