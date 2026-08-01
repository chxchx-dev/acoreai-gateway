export type UserRole = 'FREE' | 'ACADEMIC' | 'PLUS' | 'ADMIN';

export const PLAN_LABELS: Record<UserRole, string> = {
  FREE:     'Plan Free',
  ACADEMIC: 'Plan Académico',
  PLUS:     'Plan Plus',
  ADMIN:    'Admin',
};

export type DemoUser = {
  id:    string;
  email: string;
  name:  string;
  role:  UserRole;
  token: string;
  refreshToken?: string;
  photo?: string;
};


export function readStoredUser(): DemoUser | null {
  const raw = window.localStorage.getItem('olan-web:user');
  if (!raw) return null;

  try {
    return JSON.parse(raw) as DemoUser;
  } catch {
    window.localStorage.removeItem('olan-web:user');
    return null;
  }
}

export function storeUser(user: DemoUser) {
  window.localStorage.setItem('olan-web:user', JSON.stringify(user));
}

export function clearStoredUser() {
  window.localStorage.removeItem('olan-web:user');
}
