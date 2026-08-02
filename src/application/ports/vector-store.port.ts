import { RagChunk } from 'src/domain/rag/rag-chunk';

export const VECTOR_STORE_PORT = Symbol('VECTOR_STORE_PORT');

export interface VectorStorePort {
  searchSimilarChunks(input: {
    embedding: number[];
    model: string;
    limit: number;
    minScore: number;
  }): Promise<RagChunk[]>;
}
