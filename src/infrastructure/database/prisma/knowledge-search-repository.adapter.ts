import { Injectable } from '@nestjs/common';
import { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';
import { KnowledgeSearchRepositoryPort } from 'src/application/ports/knowledge-search-repository.port';

@Injectable()
export class KnowledgeSearchRepositoryAdapter implements KnowledgeSearchRepositoryPort {
  constructor(private readonly searchService: KnowledgeSearchService) {}

  search(...args: Parameters<KnowledgeSearchService['search']>) {
    return this.searchService.search(...args);
  }

  listUnanswered(...args: Parameters<KnowledgeSearchService['listUnanswered']>) {
    return this.searchService.listUnanswered(...args);
  }
}
