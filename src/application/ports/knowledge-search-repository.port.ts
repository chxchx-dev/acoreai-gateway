import type { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';

export const KNOWLEDGE_SEARCH_REPOSITORY_PORT = Symbol('KNOWLEDGE_SEARCH_REPOSITORY_PORT');

export type KnowledgeSearchRepositoryPort = Pick<
  KnowledgeSearchService,
  'search' | 'listUnanswered'
>;
