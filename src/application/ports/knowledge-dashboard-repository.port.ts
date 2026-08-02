import type { KnowledgeDashboardService } from 'src/modules/knowledge/knowledge-dashboard.service';

export const KNOWLEDGE_DASHBOARD_REPOSITORY_PORT = Symbol('KNOWLEDGE_DASHBOARD_REPOSITORY_PORT');

export type KnowledgeDashboardRepositoryPort = Pick<KnowledgeDashboardService, 'getDashboard'>;
