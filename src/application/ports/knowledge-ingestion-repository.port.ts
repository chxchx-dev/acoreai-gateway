import type { KnowledgeIngestionService } from 'src/modules/knowledge/ingestion/knowledge-ingestion.service';

export const KNOWLEDGE_INGESTION_REPOSITORY_PORT = Symbol('KNOWLEDGE_INGESTION_REPOSITORY_PORT');

export type KnowledgeIngestionRepositoryPort = Pick<
  KnowledgeIngestionService,
  'queueProcessing' | 'process' | 'chunkAndPersist'
>;
