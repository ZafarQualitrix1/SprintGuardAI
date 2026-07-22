import { z } from 'zod';

// Shared pagination contract used by both apps/api (validation via ValidationPipe/Zod) and
// apps/web (TanStack Query request typing) -- one definition, never duplicated per endpoint.
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}
