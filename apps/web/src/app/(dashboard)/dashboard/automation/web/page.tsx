import {
  Camera,
  Eye,
  FileCode2,
  Github,
  GitFork,
  Globe,
  Layers,
  MousePointerClick,
  RotateCw,
  Route,
  Smartphone,
  Sparkles,
  Video,
  Wand2,
  Workflow,
} from 'lucide-react';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const ROADMAP = [
  { icon: Wand2, label: 'AI Generated Playwright UI Scripts' },
  { icon: FileCode2, label: 'AI Generated Page Objects' },
  { icon: MousePointerClick, label: 'Component Locators' },
  { icon: Layers, label: 'Cross Browser Execution' },
  { icon: Smartphone, label: 'Responsive Testing' },
  { icon: Eye, label: 'Visual Regression' },
  { icon: Camera, label: 'Screenshot Validation' },
  { icon: Route, label: 'Trace Viewer' },
  { icon: Video, label: 'Video Recording' },
  { icon: Workflow, label: 'Jenkins Integration' },
  { icon: Github, label: 'GitHub Actions Integration' },
  { icon: GitFork, label: 'Parallel Execution' },
  { icon: RotateCw, label: 'Smart Retry' },
  { icon: Sparkles, label: 'AI Healing Locators' },
];

// Placeholder release: no backend integration yet -- API Automation (the sibling module) is where
// the real AI-generated-automation architecture lives today; this page exists so the sidebar entry
// has somewhere to land, and to set expectations for what ships next.
export default function WebAutomationPage() {
  return (
    <div>
      <PageHeader title="Web Automation" description="AI Powered Playwright UI Automation" />

      <Card className="mb-6 border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <Globe className="h-7 w-7 text-primary" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-lg font-semibold">Coming Soon</h2>
              <Badge variant="secondary">In development</Badge>
            </div>
            <p className="max-w-md text-sm text-muted-foreground">
              AI-generated Playwright UI automation, built on the same engine already powering API
              Automation, is next on the roadmap.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature roadmap</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROADMAP.map((feature) => (
              <div key={feature.label} className="flex items-center gap-2.5 rounded-md border p-3 text-sm">
                <feature.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span>{feature.label}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
