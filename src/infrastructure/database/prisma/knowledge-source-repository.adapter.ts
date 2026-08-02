import { Injectable } from '@nestjs/common';
import { KnowledgeSourcesService } from 'src/modules/knowledge/knowledge-sources.service';
import { KnowledgeSourceRepositoryPort } from 'src/application/ports/knowledge-source-repository.port';

@Injectable()
export class KnowledgeSourceRepositoryAdapter implements KnowledgeSourceRepositoryPort {
  constructor(private readonly sources: KnowledgeSourcesService) {}

  create(...args: Parameters<KnowledgeSourcesService['create']>) {
    return this.sources.create(...args);
  }

  createFromUpload(...args: Parameters<KnowledgeSourcesService['createFromUpload']>) {
    return this.sources.createFromUpload(...args);
  }

  findAll(...args: Parameters<KnowledgeSourcesService['findAll']>) {
    return this.sources.findAll(...args);
  }

  findOne(...args: Parameters<KnowledgeSourcesService['findOne']>) {
    return this.sources.findOne(...args);
  }

  update(...args: Parameters<KnowledgeSourcesService['update']>) {
    return this.sources.update(...args);
  }

  createNewVersion(...args: Parameters<KnowledgeSourcesService['createNewVersion']>) {
    return this.sources.createNewVersion(...args);
  }

  reprocess(...args: Parameters<KnowledgeSourcesService['reprocess']>) {
    return this.sources.reprocess(...args);
  }

  remove(...args: Parameters<KnowledgeSourcesService['remove']>) {
    return this.sources.remove(...args);
  }

  retryEmbeddings(...args: Parameters<KnowledgeSourcesService['retryEmbeddings']>) {
    return this.sources.retryEmbeddings(...args);
  }

  compareVersions(...args: Parameters<KnowledgeSourcesService['compareVersions']>) {
    return this.sources.compareVersions(...args);
  }
}
