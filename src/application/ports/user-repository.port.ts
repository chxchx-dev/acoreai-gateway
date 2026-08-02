import { UserRole } from 'src/domain/auth/user-role';
import { KnowledgeRole } from 'src/domain/knowledge/knowledge-role';
import { CreateUserData, UserRecord } from 'src/domain/auth/user-record';

export const USER_REPOSITORY_PORT = Symbol('USER_REPOSITORY_PORT');

export interface UserRepositoryPort {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  findMany(): Promise<UserRecord[]>;
  create(data: CreateUserData): Promise<UserRecord>;
  updatePasswordById(id: string, passwordHash: string): Promise<void>;
  /** También limpia resetTokenHash/resetTokenExpiresAt (cierre del flujo de recuperación). */
  updatePasswordByEmail(email: string, passwordHash: string): Promise<void>;
  setResetToken(email: string, resetTokenHash: string, resetTokenExpiresAt: Date): Promise<void>;
  updateProfileByEmail(
    email: string,
    data: { passwordHash: string; name: string; role: UserRole },
  ): Promise<void>;
  updateKnowledgeRole(id: string, knowledgeRole: KnowledgeRole | null): Promise<UserRecord>;
}
