export const INVITATION_REPOSITORY = Symbol('IInvitationRepository');

export interface InvitationRecord {
  id: string;
  organizationId: string;
  email: string;
  roleId: string;
  roleKey: string;
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED';
  invitedBy: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  createdAt: Date;
}

export interface CreateInvitationInput {
  organizationId: string;
  email: string;
  roleId: string;
  tokenHash: string;
  invitedBy: string;
  expiresAt: Date;
}

export interface IInvitationRepository {
  create(input: CreateInvitationInput): Promise<InvitationRecord>;
  findByTokenHash(tokenHash: string): Promise<InvitationRecord | null>;
  listByOrg(organizationId: string): Promise<InvitationRecord[]>;
  revoke(id: string, organizationId: string): Promise<void>;
  markAccepted(id: string): Promise<void>;
}
