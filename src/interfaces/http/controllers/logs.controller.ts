import { ForbiddenException, Controller, Get, Inject, Param, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { JwtPayload, UserRole } from 'src/modules/auth/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { LogsQueryDto } from '../dto/logs/logs-query.dto';
import { LogsExportQueryDto } from '../dto/logs/logs-export-query.dto';
import {
  CHAT_LOG_REPOSITORY_PORT,
  ChatLogRepositoryPort,
} from 'src/application/ports/chat-log-repository.port';
import { buildLogsCsv, buildLogsXlsx } from 'src/modules/logs/export.util';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

function isAdmin(req: Request): boolean {
  return jwtUser(req).role === UserRole.ADMIN;
}

@UseGuards(JwtAuthGuard)
@Controller('logs')
export class LogsController {
  constructor(
    @Inject(CHAT_LOG_REPOSITORY_PORT)
    private readonly logsService: ChatLogRepositoryPort,
  ) {}

  @Get('conversations')
  async findConversations(
    @Query('userId') userId: string | undefined,
    @Req() req: Request,
  ) {
    const resolvedUserId = isAdmin(req) ? userId ?? jwtUser(req).sub : jwtUser(req).sub;
    return this.logsService.findConversationsByUser(resolvedUserId);
  }

  // Descarga del historial completo en CSV/Excel — solo ADMIN, para tratamiento
  // de datos fuera del panel (no expone esto a usuarios finales).
  @Get('export')
  async export(@Query() query: LogsExportQueryDto, @Req() req: Request, @Res() res: Response) {
    if (!isAdmin(req)) {
      throw new ForbiddenException('Solo administradores pueden exportar el historial');
    }

    const logs = await this.logsService.exportLogs({
      status: query.status,
      source: query.source,
      userId: query.userId,
      from: query.from,
      to: query.to,
    });

    const timestamp = new Date().toISOString().slice(0, 10);

    if (query.format === 'xlsx') {
      const buffer = await buildLogsXlsx(logs);
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="historial-${timestamp}.xlsx"`);
      res.send(buffer);
      return;
    }

    const csv = buildLogsCsv(logs);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="historial-${timestamp}.csv"`);
    res.send(`﻿${csv}`);
  }

  @Get()
  async findAll(@Query() query: LogsQueryDto, @Req() req: Request) {
    const userId = isAdmin(req) ? query.userId : jwtUser(req).sub;
    return this.logsService.findAll({ ...query, userId });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req: Request) {
    const log = await this.logsService.findOne(id);
    if (!isAdmin(req) && log.userId !== jwtUser(req).sub) {
      throw new ForbiddenException('No puedes consultar este log');
    }

    return log;
  }
}
