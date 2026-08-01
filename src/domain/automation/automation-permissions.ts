import { KnowledgeRole } from '../knowledge/knowledge-role';

// V1: solo roles de plataforma tienen acceso al motor de automatización.
// No se diseña una matriz de roles dedicada (nadie la pidió todavía) — se
// puede refinar más adelante calcando el patrón de knowledge-permissions.ts.
export type AutomationAction = 'manage_process' | 'view_process' | 'manage_logs';

const FULL_ACCESS_ROLES = new Set([KnowledgeRole.SUPER_ADMIN, KnowledgeRole.TENANT_ADMIN]);

export function canPerformAutomationAction(role: KnowledgeRole | null, _action: AutomationAction): boolean {
  if (!role) return false;
  return FULL_ACCESS_ROLES.has(role);
}
