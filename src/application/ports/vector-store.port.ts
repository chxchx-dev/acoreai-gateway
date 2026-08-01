import { RagChunkRecord } from 'src/modules/rag/rag-store.service';

export const VECTOR_STORE_PORT = Symbol('VECTOR_STORE_PORT');

export interface VectorStorePort {
  searchSimilarChunks(input: {
    embedding: number[];
    model: string;
    limit: number;
    minScore: number;
  }): Promise<RagChunkRecord[]>;
}
