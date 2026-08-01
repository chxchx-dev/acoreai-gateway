import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AutomationPermissionGuard } from '../guards/automation-permission.guard';
import { RequireAutomationAction } from '../decorators/automation-action.decorator';
import { CreateAutomationLogDto } from '../dto/automation/create-automation-log.dto';
import { AutomationLogsService } from 'src/modules/automation/automation-logs.service';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@UseGuards(ApiKeyGuard, JwtAuthGuard, AutomationPermissionGuard)
@Controller('automation')
export class AutomationLogsController {
  constructor(private readonly logs: AutomationLogsService) {}

  @Get('processes/:processId/logs')
  @RequireAutomationAction('view_process')
  list(@Param('processId') processId: string) {
    return this.logs.list(processId);
  }

  @Post('processes/:processId/logs')
  @RequireAutomationAction('manage_logs')
  create(@Param('processId') processId: string, @Body() dto: CreateAutomationLogDto, @Req() req: Request) {
    return this.logs.create(processId, dto, jwtUser(req).sub);
  }

  @Delete('logs/:logId')
  @RequireAutomationAction('manage_logs')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('logId') logId: string): Promise<void> {
    return this.logs.remove(logId);
  }
}
