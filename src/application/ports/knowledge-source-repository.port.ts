import type { KnowledgeSourcesService } from 'src/modules/knowledge/knowledge-sources.service';

export const KNOWLEDGE_SOURCE_REPOSITORY_PORT = Symbol('KNOWLEDGE_SOURCE_REPOSITORY_PORT');

export type KnowledgeSourceRepositoryPort = Pick<
  KnowledgeSourcesService,
  | 'create'
  | 'createFromUpload'
  | 'findAll'
  | 'findOne'
  | 'update'
  | 'createNewVersion'
  | 'reprocess'
  | 'remove'
  | 'retryEmbeddings'
  | 'compareVersions'
>;
