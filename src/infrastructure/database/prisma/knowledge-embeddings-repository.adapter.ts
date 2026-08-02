import { Injectable } from '@nestjs/common';
import { KnowledgeEmbeddingsService } from 'src/modules/knowledge/embeddings/knowledge-embeddings.service';
import { KnowledgeEmbeddingsRepositoryPort } from 'src/application/ports/knowledge-embeddings-repository.port';

@Injectable()
export class KnowledgeEmbeddingsRepositoryAdapter implements KnowledgeEmbeddingsRepositoryPort {
  constructor(private readonly embeddings: KnowledgeEmbeddingsService) {}

  queueGeneration(...args: Parameters<KnowledgeEmbeddingsService['queueGeneration']>) {
    return this.embeddings.queueGeneration(...args);
  }

  generate(...args: Parameters<KnowledgeEmbeddingsService['generate']>) {
    return this.embeddings.generate(...args);
  }
}
