import { UserRole } from './user-role';
import { KnowledgeRole } from '../knowledge/knowledge-role';

export interface UserRecord {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  knowledgeRole: KnowledgeRole | null;
  passwordHash: string;
  resetTokenHash: string | null;
  resetTokenExpiresAt: Date | null;
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  passwordHash: string;
  name: string;
  role: UserRole;
  knowledgeRole?: KnowledgeRole | null;
}
