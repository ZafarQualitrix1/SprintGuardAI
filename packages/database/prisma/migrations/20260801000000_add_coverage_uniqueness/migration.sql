-- Test Coverage module: one CoverageMatrixEntry/Gap row per (sprint, requirement). A "Compute
-- Coverage" recompute deletes and reinserts the full set for a sprint in one transaction; this
-- constraint stops a duplicate insert if two recompute calls ever land concurrently, converting a
-- silent double-row bug into a clear DB error instead. Both tables are empty today (nothing has
-- ever written to them -- confirmed via grep before this migration), so no backfill needed.

CREATE UNIQUE INDEX "CoverageMatrixEntry_sprintId_requirementId_key"
  ON "CoverageMatrixEntry"("sprintId", "requirementId");

CREATE UNIQUE INDEX "Gap_sprintId_requirementId_key"
  ON "Gap"("sprintId", "requirementId");
