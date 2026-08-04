import type { TestScenario } from '@sprintguard/shared';
import { apiClient } from '@/lib/api-client';

export const testIntelligenceApi = {
  listByStory: (storyId: string) => apiClient.get<TestScenario[]>(`/stories/${storyId}/tests`),
  generateScenarios: (storyId: string) =>
    apiClient.post<TestScenario[]>(`/stories/${storyId}/tests/generate-scenarios`),
  generateCases: (storyId: string) => apiClient.post<TestScenario[]>(`/stories/${storyId}/tests/generate-cases`),
  // xlsx/csv are generated server-side (see test-case-export.service.ts); pdf is generated
  // client-side (features/test-intelligence/lib/export-pdf.ts) since jsPDF has no server-side
  // dependency in this repo and is fundamentally a browser library.
  exportTests: (storyId: string, format: 'xlsx' | 'csv') =>
    apiClient.getBlob(`/stories/${storyId}/tests/export?format=${format}`),
};
