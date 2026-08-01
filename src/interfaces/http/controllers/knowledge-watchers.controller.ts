import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { CreateKnowledgeWatcherDto, SetWatcherStatusDto } from '../dto/knowledge/create-knowledge-watcher.dto';
import { KnowledgeWatcherService } from 'src/modules/knowledge/watchers/knowledge-watcher.service';
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
  constructor(private readonly knowledgeWatcherService: KnowledgeWatcherService) {}

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
