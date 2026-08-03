import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SelectedStoryState {
  sprintId: string | null;
  storyId: string | null;
  hasHydrated: boolean;
  selectStory: (sprintId: string, storyId: string) => void;
  clearSelection: () => void;
  setHasHydrated: (value: boolean) => void;
}

// User-story-driven workflow (Bug 1): once a story is selected on the sprint dashboard, every
// downstream module (Requirement Intelligence, Test Generator, Coverage, Manual Execution,
// Automation Execution, Release Readiness) reads it from here instead of rendering every story in
// the sprint at once. Persisted so navigating between tabs (or a hard refresh mid-workflow) keeps
// the same story selected -- same persisted-Zustand-plus-hydration-flag pattern as auth-store.ts,
// see its comment for why `hasHydrated` matters.
//
// Scoped by sprintId: switching to a different sprint's pages should not silently keep an old
// sprint's story selected, so every consumer must check `sprintId === current sprint` before
// trusting `storyId` (selectStoryForSprint below does this).
export const useSelectedStoryStore = create<SelectedStoryState>()(
  persist(
    (set) => ({
      sprintId: null,
      storyId: null,
      hasHydrated: false,
      selectStory: (sprintId, storyId) => set({ sprintId, storyId }),
      clearSelection: () => set({ sprintId: null, storyId: null }),
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'sprintguard-selected-story',
      partialize: (state) => ({ sprintId: state.sprintId, storyId: state.storyId }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    },
  ),
);

// Convenience selector: returns the selected storyId only if it belongs to the given sprint,
// otherwise null -- every workflow page should use this, not the raw store, so a stale selection
// from a different sprint never leaks in.
export function useSelectedStoryForSprint(sprintId: string): string | null {
  const state = useSelectedStoryStore();
  return state.hasHydrated && state.sprintId === sprintId ? state.storyId : null;
}
