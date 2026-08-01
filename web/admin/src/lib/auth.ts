const TOKEN_KEY = 'knowledge_admin_token';
const USER_KEY = 'knowledge_admin_user';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  knowledgeRole: string | null;
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setSession(token: string, user: StoredUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): StoredUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as StoredUser;
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
