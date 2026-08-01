import { Injectable } from '@nestjs/common';
import { RagChunkRecord, RagStoreService } from 'src/modules/rag/rag-store.service';
import { VectorStorePort } from 'src/application/ports/vector-store.port';

@Injectable()
export class PgvectorAdapter implements VectorStorePort {
  constructor(private readonly ragStore: RagStoreService) {}

  searchSimilarChunks(input: {
    embedding: number[];
    model: string;
    limit: number;
    minScore: number;
  }): Promise<RagChunkRecord[]> {
    return this.ragStore.searchSimilarChunks(input);
  }
}
