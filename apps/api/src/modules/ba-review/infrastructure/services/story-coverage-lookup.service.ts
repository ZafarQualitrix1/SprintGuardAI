import { Injectable } from '@nestjs/common';
import { PrismaService } from '@sprintguard/database';

// Reads the already-persisted CoverageMatrixEntry rows (owned by the `coverage` module) scoped to
// this story's requirements, for display in the BA review comment/document. Direct cross-module
// Prisma read for a derived/display-only metric -- same precedent as prompt-management's
// PrismaPromptRepository joining AiProviderConfig/ModelRegistryEntry. Returns null (not 0) when
// coverage hasn't been computed yet for this sprint, so callers can render "N/A" instead of a
// misleading 0%.
@Injectable()
export class StoryCoverageLookupService {
  constructor(private readonly prisma: PrismaService) {}

  async getStoryCoveragePercent(storyId: string): Promise<number | null> {
    const entries = await this.prisma.coverageMatrixEntry.findMany({
      where: { requirement: { storyId } },
      select: { coverageStatus: true },
    });
    if (entries.length === 0) {
      return null;
    }
    const covered = entries.filter((entry) => entry.coverageStatus === 'COVERED').length;
    return Math.round((covered / entries.length) * 1000) / 10;
  }
}
