import { Injectable } from '@nestjs/common';
import { KnowledgeAuditService } from 'src/modules/knowledge/knowledge-audit.service';
import { KnowledgeAuditRepositoryPort } from 'src/application/ports/knowledge-audit-repository.port';

@Injectable()
export class KnowledgeAuditRepositoryAdapter implements KnowledgeAuditRepositoryPort {
  constructor(private readonly audit: KnowledgeAuditService) {}

  log(...args: Parameters<KnowledgeAuditService['log']>) {
    return this.audit.log(...args);
  }

  list(...args: Parameters<KnowledgeAuditService['list']>) {
    return this.audit.list(...args);
  }
}
