import { create } from 'zustand';

interface UIState {
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;
  activeOrganizationId: string | null;
  setActiveOrganizationId: (organizationId: string) => void;
}

// Local UI state that has no business being in server cache (TanStack Query) or persisted session
// state (auth-store) -- sidebar collapse, active org switcher, etc.
export const useUIStore = create<UIState>((set) => ({
  isSidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),
  activeOrganizationId: null,
  setActiveOrganizationId: (organizationId) => set({ activeOrganizationId: organizationId }),
}));
