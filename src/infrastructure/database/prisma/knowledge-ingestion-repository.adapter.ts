import { Injectable } from '@nestjs/common';
import { KnowledgeIngestionService } from 'src/modules/knowledge/ingestion/knowledge-ingestion.service';
import { KnowledgeIngestionRepositoryPort } from 'src/application/ports/knowledge-ingestion-repository.port';

@Injectable()
export class KnowledgeIngestionRepositoryAdapter implements KnowledgeIngestionRepositoryPort {
  constructor(private readonly ingestion: KnowledgeIngestionService) {}

  queueProcessing(...args: Parameters<KnowledgeIngestionService['queueProcessing']>) {
    return this.ingestion.queueProcessing(...args);
  }

  process(...args: Parameters<KnowledgeIngestionService['process']>) {
    return this.ingestion.process(...args);
  }

  chunkAndPersist(...args: Parameters<KnowledgeIngestionService['chunkAndPersist']>) {
    return this.ingestion.chunkAndPersist(...args);
  }
}
