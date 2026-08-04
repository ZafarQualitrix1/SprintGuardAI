import type { LucideIcon } from 'lucide-react';
import {
  LayoutDashboard,
  Rocket,
  BarChart3,
  Settings,
  ShieldCheck,
  Sparkles,
  FileText,
  Bot,
  Globe,
  Webhook,
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  // Server-side is the real enforcement (@RequirePermission on the routes this page calls) --
  // this only hides the link from users who'd immediately hit a 403 opening it.
  requiredPermission?: string;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Primary navigation, mirroring the MVP page scope. Sprint-scoped pages (Analysis, Story
// Intelligence, Requirement Intelligence, AI Test Generator, Manual Execution, Release
// Readiness) are reached by drilling into a sprint from /dashboard/sprints, not top-level nav
// items -- they require a [sprintId] param. Automation is the exception: it's cross-sprint (a BA-
// approved test case from any sprint can be automated from one place), so it lives here instead.
export const navSections: NavSection[] = [
  {
    title: 'Overview',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { label: 'Sprints', href: '/dashboard/sprints', icon: Rocket },
      { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'Automation',
    items: [
      { label: 'Web Automation', href: '/dashboard/automation/web', icon: Globe },
      { label: 'API Automation', href: '/dashboard/automation/api', icon: Webhook },
    ],
  },
  {
    title: 'AI',
    items: [
      { label: 'Prompt Management', href: '/dashboard/settings/prompts', icon: FileText },
      { label: 'AI Settings', href: '/dashboard/settings/ai', icon: Sparkles },
    ],
  },
  {
    title: 'Administration',
    items: [
      {
        label: 'Organization Settings',
        href: '/dashboard/settings/organization',
        icon: Settings,
        requiredPermission: 'org:manage',
      },
      { label: 'Admin', href: '/dashboard/admin', icon: ShieldCheck, requiredPermission: 'org:manage' },
    ],
  },
];

export const brand = {
  name: 'SprintGuard AI',
  icon: Bot,
};
