import { getEffectiveKnowledgeRole, getStoredUser } from './auth';

// Espejo de src/domain/knowledge/knowledge-permissions.ts del backend.
// Solo controla qué se muestra en la UI; el backend es quien de verdad
// aplica los permisos (esto evita mostrar botones que van a fallar con 403,
// pero no reemplaza la validación real).
export type KnowledgeAction =
  | 'create_source'
  | 'view_source'
  | 'edit_metadata'
  | 'edit_chunk'
  | 'approve'
  | 'publish'
  | 'archive'
  | 'view_audit'
  | 'supervise_tools';

const FULL_ACCESS_ROLES = new Set(['SUPER_ADMIN', 'TENANT_ADMIN']);

// Los flags "opcional" del supervisor (publicar/archivar/ver auditoría) no
// se conocen en el cliente sin una llamada extra; se asume el default (false)
// y el backend decide de verdad. Si tu instancia activó esos flags, algunos
// botones quedarán ocultos aunque el backend los permitiría — ajustable aquí.
const SUPERVISOR_FLAGS = {
  canPublish: false,
  canArchive: false,
  canViewAudit: false,
};

export function can(action: KnowledgeAction): boolean {
  const role = getEffectiveKnowledgeRole(getStoredUser());
  if (!role) return false;
  if (FULL_ACCESS_ROLES.has(role)) return true;

  switch (action) {
    case 'create_source':
      return role === 'KNOWLEDGE_SUPERVISOR' || role === 'KNOWLEDGE_UPLOADER';
    case 'view_source':
      return role === 'KNOWLEDGE_SUPERVISOR' || role === 'KNOWLEDGE_UPLOADER' || role === 'AUDITOR';
    case 'edit_metadata':
      return role === 'KNOWLEDGE_SUPERVISOR' || role === 'KNOWLEDGE_UPLOADER';
    case 'edit_chunk':
    case 'approve':
    case 'supervise_tools':
      return role === 'KNOWLEDGE_SUPERVISOR';
    case 'publish':
      return role === 'KNOWLEDGE_SUPERVISOR' && SUPERVISOR_FLAGS.canPublish;
    case 'archive':
      return role === 'KNOWLEDGE_SUPERVISOR' && SUPERVISOR_FLAGS.canArchive;
    case 'view_audit':
      return role === 'AUDITOR' || (role === 'KNOWLEDGE_SUPERVISOR' && SUPERVISOR_FLAGS.canViewAudit);
    default:
      return false;
  }
}

// Motor de automatización: v1 solo SUPER_ADMIN/TENANT_ADMIN, sin matriz de
// roles dedicada (espejo simplificado de src/domain/automation/automation-permissions.ts).
export type AutomationAction = 'manage_process' | 'view_process' | 'manage_logs';

export function canAutomation(_action: AutomationAction): boolean {
  const role = getEffectiveKnowledgeRole(getStoredUser());
  if (!role) return false;
  return FULL_ACCESS_ROLES.has(role);
}

export function roleLabel(role: string | null): string {
  const labels: Record<string, string> = {
    SUPER_ADMIN: 'Super administrador',
    TENANT_ADMIN: 'Administrador',
    KNOWLEDGE_SUPERVISOR: 'Supervisor',
    KNOWLEDGE_UPLOADER: 'Cargador de fuentes',
    AUDITOR: 'Auditor',
    CHAT_USER: 'Usuario de chat',
  };
  return role ? (labels[role] ?? role) : 'Sin rol asignado';
}
