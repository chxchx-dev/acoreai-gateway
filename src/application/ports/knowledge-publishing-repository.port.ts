import type { KnowledgePublishingService } from 'src/modules/knowledge/knowledge-publishing.service';

export const KNOWLEDGE_PUBLISHING_REPOSITORY_PORT = Symbol('KNOWLEDGE_PUBLISHING_REPOSITORY_PORT');

export type KnowledgePublishingRepositoryPort = Pick<
  KnowledgePublishingService,
  'publish' | 'archive'
>;
