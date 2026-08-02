import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import {
  KNOWLEDGE_DASHBOARD_REPOSITORY_PORT,
  KnowledgeDashboardRepositoryPort,
} from 'src/application/ports/knowledge-dashboard-repository.port';

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('supervise_tools')
@Controller('knowledge/dashboard')
export class KnowledgeDashboardController {
  constructor(
    @Inject(KNOWLEDGE_DASHBOARD_REPOSITORY_PORT)
    private readonly knowledgeDashboardService: KnowledgeDashboardRepositoryPort,
  ) {}

  @Get()
  get() {
    return this.knowledgeDashboardService.getDashboard();
  }
}
