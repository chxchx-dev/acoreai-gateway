import type { KnowledgeAuditService } from 'src/modules/knowledge/knowledge-audit.service';

export const KNOWLEDGE_AUDIT_REPOSITORY_PORT = Symbol('KNOWLEDGE_AUDIT_REPOSITORY_PORT');

/** Import de solo-tipo: ver nota en language-profile-repository.port.ts. */
export type KnowledgeAuditRepositoryPort = Pick<KnowledgeAuditService, 'log' | 'list'>;
