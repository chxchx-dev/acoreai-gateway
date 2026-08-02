import { Injectable } from '@nestjs/common';
import { RagStoreService } from 'src/modules/rag/rag-store.service';
import { VectorStorePort } from 'src/application/ports/vector-store.port';
import { RagChunk } from 'src/domain/rag/rag-chunk';

@Injectable()
export class PgvectorAdapter implements VectorStorePort {
  constructor(private readonly ragStore: RagStoreService) {}

  searchSimilarChunks(input: {
    embedding: number[];
    model: string;
    limit: number;
    minScore: number;
  }): Promise<RagChunk[]> {
    return this.ragStore.searchSimilarChunks(input);
  }
}
