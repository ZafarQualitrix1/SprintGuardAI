import type { AiPrompt, PromptApproval, User } from '@sprintguard/database';
import { PromptApprovalEntity, PromptEntity } from '../../domain/entities/prompt.entity';

type ApprovalWithReviewer = PromptApproval & { reviewer: Pick<User, 'fullName'> };
type PromptWithApprovals = AiPrompt & { approvals?: ApprovalWithReviewer[] };

export function toPromptApprovalEntity(row: ApprovalWithReviewer): PromptApprovalEntity {
  return new PromptApprovalEntity(
    row.id,
    row.promptId,
    row.reviewerId,
    row.reviewer.fullName,
    row.decision,
    row.rationale,
    row.createdAt,
  );
}

export function toPromptEntity(row: PromptWithApprovals): PromptEntity {
  return new PromptEntity(
    row.id,
    row.capability,
    row.version,
    row.template,
    row.jsonSchema,
    row.status,
    row.isActive,
    row.createdBy,
    row.createdAt,
    row.updatedAt,
    row.name,
    row.description,
    row.category,
    (row.tags as string[] | null) ?? [],
    row.changeSummary,
    (row.approvals ?? []).map(toPromptApprovalEntity),
  );
}
