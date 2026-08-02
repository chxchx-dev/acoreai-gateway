import { UserRole } from './user-role';

export interface AuthSessionRecord {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  deviceId: string | null;
  deviceName: string | null;
  platform: string | null;
  createdAt: Date;
  user?: { id: string; email: string; name: string; role: UserRole };
}

export interface CreateAuthSessionData {
  id: string;
  userId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  deviceId?: string;
  deviceName?: string;
  platform?: string;
}
