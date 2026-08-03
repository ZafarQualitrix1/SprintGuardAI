// Plain-TypeScript Domain entity -- no framework or Prisma imports (Solution Architecture §7).
// Represents identity only; role/permission resolution happens through Membership, not here.
export class UserEntity {
  constructor(
    public readonly id: string,
    public readonly email: string,
    public readonly fullName: string,
    public readonly passwordHash: string | null,
    public readonly isActive: boolean,
    public readonly avatarUrl: string | null = null,
  ) {}

  static create(params: { id: string; email: string; fullName: string; passwordHash: string }): UserEntity {
    return new UserEntity(params.id, params.email, params.fullName, params.passwordHash, true, null);
  }
}
