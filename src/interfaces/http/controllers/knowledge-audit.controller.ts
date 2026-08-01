import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { KnowledgeAuditQueryDto } from '../dto/knowledge/knowledge-audit-query.dto';
import { KnowledgeAuditService } from 'src/modules/knowledge/knowledge-audit.service';

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('view_audit')
@Controller('knowledge/audit')
export class KnowledgeAuditController {
  constructor(private readonly knowledgeAuditService: KnowledgeAuditService) {}

  @Get()
  list(@Query() query: KnowledgeAuditQueryDto) {
    return this.knowledgeAuditService.list(query);
  }
}
