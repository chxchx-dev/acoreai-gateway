import { AuthSessionRecord, CreateAuthSessionData } from 'src/domain/auth/auth-session-record';

export const AUTH_SESSION_REPOSITORY_PORT = Symbol('AUTH_SESSION_REPOSITORY_PORT');

export interface AuthSessionRepositoryPort {
  create(data: CreateAuthSessionData): Promise<void>;
  findById(id: string): Promise<AuthSessionRecord | null>;
  findByIdWithUser(id: string): Promise<AuthSessionRecord | null>;
  findActiveByUserId(userId: string): Promise<AuthSessionRecord | null>;
  revoke(id: string): Promise<void>;
  revokeAllForUser(userId: string): Promise<void>;
}
