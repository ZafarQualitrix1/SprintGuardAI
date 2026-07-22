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
} from 'lucide-react';

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// Primary navigation, mirroring the MVP page scope. Sprint-scoped pages (Analysis, Story
// Intelligence, Requirement Intelligence, Coverage, AI Test Generator, Executions, Release
// Readiness) are reached by drilling into a sprint from /dashboard/sprints, not top-level nav
// items -- they require a [sprintId] param.
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
    title: 'AI',
    items: [
      { label: 'Prompt Management', href: '/dashboard/settings/prompts', icon: FileText },
      { label: 'AI Settings', href: '/dashboard/settings/ai', icon: Sparkles },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Organization Settings', href: '/dashboard/settings/organization', icon: Settings },
      { label: 'Admin', href: '/dashboard/admin', icon: ShieldCheck },
    ],
  },
];

export const brand = {
  name: 'SprintGuard AI',
  icon: Bot,
};
