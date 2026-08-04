import { KnowledgeRole } from '../knowledge/knowledge-role';

export type AutomationAction = 'manage_process' | 'view_process' | 'manage_logs';

const FULL_ACCESS_ROLES = new Set([KnowledgeRole.SUPER_ADMIN, KnowledgeRole.TENANT_ADMIN]);

export function canPerformAutomationAction(role: KnowledgeRole | null, _action: AutomationAction): boolean {
  if (!role) return false;
  return FULL_ACCESS_ROLES.has(role);
}
