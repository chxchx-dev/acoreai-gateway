// The unified web app uses one session for the user and Knowledge Center
// areas. Legacy admin keys are cleared during logout for safe migration.
const SESSION_KEY = 'acoreai-web:user';
const LEGACY_TOKEN_KEY = 'knowledge_admin_token';
const LEGACY_USER_KEY = 'knowledge_admin_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  knowledgeRole: string | null;
  token?: string;
}

export function getToken(): string | null {
  const user = getStoredUser();
  return user?.token ?? null;
}

export function setSession(token: string, user: StoredUser): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, token }));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(LEGACY_USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as StoredUser & { token?: string };
    return parsed.token ? parsed : null;
  } catch {
    return null;
  }
}

// El rol efectivo del Centro de Conocimiento: los ADMIN generales de la
// plataforma tienen acceso total (igual que en el backend), sin necesitar
// knowledgeRole. Ver KnowledgePermissionGuard en el backend (misma regla).
export function getEffectiveKnowledgeRole(user: StoredUser | null): string | null {
  if (!user) return null;
  if (user.role === 'ADMIN') return 'SUPER_ADMIN';
  return user.knowledgeRole;
}
