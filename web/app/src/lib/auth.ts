export type UserRole = 'FREE' | 'ACADEMIC' | 'PLUS' | 'ADMIN';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  role: string;
  knowledgeRole?: string | null;
  token?: string;
}

export const PLAN_LABELS: Record<UserRole, string> = {
  FREE:     'Plan Free',
  ACADEMIC: 'Plan Académico',
  PLUS:     'Plan Plus',
  ADMIN:    'Admin',
};

export type DemoUser = StoredUser & {
  id:    string;
  email: string;
  name:  string;
  role:  UserRole;
  knowledgeRole?: string | null;
  token: string;
  refreshToken?: string;
  photo?: string;
};

const SESSION_KEY = 'acoreai-web:user';
const LEGACY_TOKEN_KEY = 'knowledge_admin_token';
const LEGACY_USER_KEY = 'knowledge_admin_user';


export function readStoredUser(): DemoUser | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    window.localStorage.removeItem('acoreai-web:user');
    return null;
  }
}

export function storeUser(user: DemoUser) {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem(SESSION_KEY);
  window.localStorage.removeItem(LEGACY_TOKEN_KEY);
  window.localStorage.removeItem(LEGACY_USER_KEY);
}

export function getToken(): string | null {
  return getStoredUser()?.token ?? null;
}

export function setSession(token: string, user: StoredUser): void {
  window.localStorage.setItem(SESSION_KEY, JSON.stringify({ ...user, token }));
}

export function clearSession(): void {
  clearStoredUser();
}

export function getStoredUser(): StoredUser | null {
  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as StoredUser;
    return parsed.token ? parsed : null;
  } catch {
    return null;
  }
}

export function getEffectiveKnowledgeRole(user: StoredUser | null): string | null {
  if (!user) return null;
  if (user.role === 'ADMIN') return 'SUPER_ADMIN';
  return user.knowledgeRole ?? null;
}
