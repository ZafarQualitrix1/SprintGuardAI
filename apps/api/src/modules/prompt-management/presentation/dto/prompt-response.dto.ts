import { PromptLibraryRow } from '../../domain/entities/prompt.entity';
import { PromptApprovalEntity, PromptEntity } from '../../domain/entities/prompt.entity';

export interface PromptApprovalResponseDto {
  id: string;
  reviewerId: string;
  reviewerName: string;
  decision: string;
  rationale: string | null;
  createdAt: string;
}

export interface PromptResponseDto {
  id: string;
  capability: string;
  version: string;
  template: string;
  jsonSchema: unknown;
  status: string;
  isActive: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  name: string | null;
  description: string | null;
  category: string | null;
  tags: string[];
  changeSummary: string | null;
  approvals: PromptApprovalResponseDto[];
}

export interface PromptLibraryRowResponseDto extends Omit<PromptLibraryRow, 'createdAt' | 'updatedAt' | 'lastUsedAt'> {
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
}

export function toPromptApprovalResponseDto(entity: PromptApprovalEntity): PromptApprovalResponseDto {
  return {
    id: entity.id,
    reviewerId: entity.reviewerId,
    reviewerName: entity.reviewerName,
    decision: entity.decision,
    rationale: entity.rationale,
    createdAt: entity.createdAt.toISOString(),
  };
}

export function toPromptResponseDto(entity: PromptEntity): PromptResponseDto {
  return {
    id: entity.id,
    capability: entity.capability,
    version: entity.version,
    template: entity.template,
    jsonSchema: entity.jsonSchema,
    status: entity.status,
    isActive: entity.isActive,
    createdBy: entity.createdBy,
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
    name: entity.name,
    description: entity.description,
    category: entity.category,
    tags: entity.tags,
    changeSummary: entity.changeSummary,
    approvals: entity.approvals.map(toPromptApprovalResponseDto),
  };
}

export function toPromptLibraryRowResponseDto(row: PromptLibraryRow): PromptLibraryRowResponseDto {
  return {
    ...row,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    lastUsedAt: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
  };
}
