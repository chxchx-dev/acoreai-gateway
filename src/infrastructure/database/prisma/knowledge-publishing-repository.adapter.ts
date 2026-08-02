import { Injectable } from '@nestjs/common';
import { KnowledgePublishingService } from 'src/modules/knowledge/knowledge-publishing.service';
import { KnowledgePublishingRepositoryPort } from 'src/application/ports/knowledge-publishing-repository.port';

@Injectable()
export class KnowledgePublishingRepositoryAdapter implements KnowledgePublishingRepositoryPort {
  constructor(private readonly publishing: KnowledgePublishingService) {}

  publish(...args: Parameters<KnowledgePublishingService['publish']>) {
    return this.publishing.publish(...args);
  }

  archive(...args: Parameters<KnowledgePublishingService['archive']>) {
    return this.publishing.archive(...args);
  }
}
