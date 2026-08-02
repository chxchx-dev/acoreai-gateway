import type { KnowledgeEmbeddingsService } from 'src/modules/knowledge/embeddings/knowledge-embeddings.service';

export const KNOWLEDGE_EMBEDDINGS_REPOSITORY_PORT = Symbol('KNOWLEDGE_EMBEDDINGS_REPOSITORY_PORT');

export type KnowledgeEmbeddingsRepositoryPort = Pick<
  KnowledgeEmbeddingsService,
  'queueGeneration' | 'generate'
>;
