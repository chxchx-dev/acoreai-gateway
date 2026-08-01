import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';

class UnansweredQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('supervise_tools')
@Controller('knowledge/unanswered-questions')
export class KnowledgeUnansweredController {
  constructor(private readonly knowledgeSearchService: KnowledgeSearchService) {}

  @Get()
  list(@Query() query: UnansweredQueryDto) {
    return this.knowledgeSearchService.listUnanswered(query.page, query.pageSize);
  }
}
