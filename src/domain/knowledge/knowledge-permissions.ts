import { KnowledgeRole } from './knowledge-role';

// Matriz de permisos del Centro de Conocimiento (plan histórico en docs/ai/07_...).
// "No opcional" en el doc = deshabilitado por default, activable por flag.
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

export interface KnowledgePermissionFlags {
  supervisorCanPublish: boolean;
  supervisorCanArchive: boolean;
  supervisorCanViewAudit: boolean;
}

export const DEFAULT_KNOWLEDGE_PERMISSION_FLAGS: KnowledgePermissionFlags = {
  supervisorCanPublish: false,
  supervisorCanArchive: false,
  supervisorCanViewAudit: false,
};

const FULL_ACCESS_ROLES = new Set([KnowledgeRole.SUPER_ADMIN, KnowledgeRole.TENANT_ADMIN]);

// Uploader y Auditor tienen acceso condicionado (ownership / solo lectura),
// resuelto por el caller (service layer), no por esta función.
export function canPerformKnowledgeAction(
  role: KnowledgeRole | null,
  action: KnowledgeAction,
  flags: KnowledgePermissionFlags = DEFAULT_KNOWLEDGE_PERMISSION_FLAGS,
): boolean {
  if (!role) return false;
  if (FULL_ACCESS_ROLES.has(role)) return true;

  switch (action) {
    case 'create_source':
      return role === KnowledgeRole.KNOWLEDGE_SUPERVISOR || role === KnowledgeRole.KNOWLEDGE_UPLOADER;
    case 'view_source':
      return (
        role === KnowledgeRole.KNOWLEDGE_SUPERVISOR ||
        role === KnowledgeRole.KNOWLEDGE_UPLOADER ||
        role === KnowledgeRole.AUDITOR
      );
    case 'edit_metadata':
      return role === KnowledgeRole.KNOWLEDGE_SUPERVISOR || role === KnowledgeRole.KNOWLEDGE_UPLOADER;
    case 'edit_chunk':
    case 'approve':
    case 'supervise_tools':
      return role === KnowledgeRole.KNOWLEDGE_SUPERVISOR;
    case 'publish':
      return role === KnowledgeRole.KNOWLEDGE_SUPERVISOR && flags.supervisorCanPublish;
    case 'archive':
      return role === KnowledgeRole.KNOWLEDGE_SUPERVISOR && flags.supervisorCanArchive;
    case 'view_audit':
      return (
        role === KnowledgeRole.AUDITOR ||
        (role === KnowledgeRole.KNOWLEDGE_SUPERVISOR && flags.supervisorCanViewAudit)
      );
    default:
      return false;
  }
}

// Estados en los que un KNOWLEDGE_UPLOADER puede seguir editando su propia fuente
// ("propias draft" en la matriz). Una vez enviada a revisión, ya no es "draft".
export const UPLOADER_EDITABLE_STATUSES = ['draft', 'pending_extraction', 'extracted', 'chunked'] as const;

export function isUploaderOnly(role: KnowledgeRole | null): boolean {
  return role === KnowledgeRole.KNOWLEDGE_UPLOADER;
}
