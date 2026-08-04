import { Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface AiRecommendationPanelProps {
  recommendations: string[];
}

export function AiRecommendationPanel({ recommendations }: AiRecommendationPanelProps) {
  // Defensive: ReleaseReport.breakdown is a JSON blob persisted as-is at compute time. Reports
  // computed before this field existed have no `recommendations` key at all, so a caller passing
  // that stale data straight through (report.breakdown.recommendations) hands us undefined here.
  const items = Array.isArray(recommendations) ? recommendations : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          AI recommendations
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          {items.map((recommendation, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{recommendation}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
