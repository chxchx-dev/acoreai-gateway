import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { KnowledgeAuditQueryDto } from '../dto/knowledge/knowledge-audit-query.dto';
import {
  KNOWLEDGE_AUDIT_REPOSITORY_PORT,
  KnowledgeAuditRepositoryPort,
} from 'src/application/ports/knowledge-audit-repository.port';

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('view_audit')
@Controller('knowledge/audit')
export class KnowledgeAuditController {
  constructor(
    @Inject(KNOWLEDGE_AUDIT_REPOSITORY_PORT)
    private readonly knowledgeAuditService: KnowledgeAuditRepositoryPort,
  ) {}

  @Get()
  list(@Query() query: KnowledgeAuditQueryDto) {
    return this.knowledgeAuditService.list(query);
  }
}
