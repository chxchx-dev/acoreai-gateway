import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { CreateKnowledgeWatcherDto, SetWatcherStatusDto } from '../dto/knowledge/create-knowledge-watcher.dto';
import {
  KNOWLEDGE_WATCHER_REPOSITORY_PORT,
  KnowledgeWatcherRepositoryPort,
} from 'src/application/ports/knowledge-watcher-repository.port';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

// Configurar watchers (qué URL vigilar y con qué frecuencia) queda al mismo
// nivel que editar metadata: SUPER_ADMIN/TENANT_ADMIN/KNOWLEDGE_SUPERVISOR.
@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('edit_metadata')
@Controller('knowledge/watchers')
export class KnowledgeWatchersController {
  constructor(
    @Inject(KNOWLEDGE_WATCHER_REPOSITORY_PORT)
    private readonly knowledgeWatcherService: KnowledgeWatcherRepositoryPort,
  ) {}

  @Post()
  create(@Body() dto: CreateKnowledgeWatcherDto, @Req() req: Request) {
    return this.knowledgeWatcherService.create(dto, jwtUser(req).sub);
  }

  @Get()
  list() {
    return this.knowledgeWatcherService.list();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.knowledgeWatcherService.findOne(id);
  }

  @Patch(':id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetWatcherStatusDto, @Req() req: Request) {
    return this.knowledgeWatcherService.setStatus(id, dto.status, jwtUser(req).sub);
  }

  @Post(':id/check')
  check(@Param('id') id: string) {
    return this.knowledgeWatcherService.checkWatcher(id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    return this.knowledgeWatcherService.remove(id, jwtUser(req).sub);
  }
}
