import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { KnowledgeDashboardService } from 'src/modules/knowledge/knowledge-dashboard.service';

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('supervise_tools')
@Controller('knowledge/dashboard')
export class KnowledgeDashboardController {
  constructor(private readonly knowledgeDashboardService: KnowledgeDashboardService) {}

  @Get()
  get() {
    return this.knowledgeDashboardService.getDashboard();
  }
}
