import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { KnowledgeSearchDto } from '../dto/knowledge/knowledge-search.dto';
import { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';

// Herramienta de depuración para el equipo de supervisión. El consumidor final
// para usuarios finales es /chat/rag (abierto a cualquier usuario autenticado).
@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('supervise_tools')
@Controller('knowledge/search')
export class KnowledgeSearchController {
  constructor(private readonly knowledgeSearchService: KnowledgeSearchService) {}

  @Post()
  search(@Body() dto: KnowledgeSearchDto) {
    return this.knowledgeSearchService
      .search({ query: dto.query, area: dto.area, language: dto.language, topK: dto.topK })
      .then((results) => ({ results }));
  }
}
