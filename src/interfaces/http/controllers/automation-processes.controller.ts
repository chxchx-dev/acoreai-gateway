import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AutomationPermissionGuard } from '../guards/automation-permission.guard';
import { RequireAutomationAction } from '../decorators/automation-action.decorator';
import { CreateAutomationProcessDto } from '../dto/automation/create-automation-process.dto';
import { UpdateAutomationProcessDto } from '../dto/automation/update-automation-process.dto';
import { UpsertAutomationStepDto } from '../dto/automation/upsert-automation-step.dto';
import { UpsertAutomationFieldDto } from '../dto/automation/upsert-automation-field.dto';
import { UpsertAutomationRuleDto } from '../dto/automation/upsert-automation-rule.dto';
import { UpsertAutomationTemplateDto } from '../dto/automation/upsert-automation-template.dto';
import { UpsertAutomationChecklistItemDto } from '../dto/automation/upsert-automation-checklist-item.dto';
import {
  AUTOMATION_PROCESS_REPOSITORY_PORT,
  AutomationProcessRepositoryPort,
} from 'src/application/ports/automation-process-repository.port';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@UseGuards(ApiKeyGuard, JwtAuthGuard, AutomationPermissionGuard)
@Controller('automation/processes')
export class AutomationProcessesController {
  constructor(
    @Inject(AUTOMATION_PROCESS_REPOSITORY_PORT)
    private readonly processes: AutomationProcessRepositoryPort,
  ) {}

  @Post()
  @RequireAutomationAction('manage_process')
  create(@Body() dto: CreateAutomationProcessDto, @Req() req: Request) {
    return this.processes.create(dto, jwtUser(req).sub);
  }

  @Get()
  @RequireAutomationAction('view_process')
  findAll() {
    return this.processes.findAll();
  }

  @Get(':id')
  @RequireAutomationAction('view_process')
  findOne(@Param('id') id: string) {
    return this.processes.findOne(id);
  }

  @Patch(':id')
  @RequireAutomationAction('manage_process')
  update(@Param('id') id: string, @Body() dto: UpdateAutomationProcessDto) {
    return this.processes.update(id, dto);
  }

  @Post(':id/publish')
  @RequireAutomationAction('manage_process')
  publish(@Param('id') id: string) {
    return this.processes.publish(id);
  }

  @Post(':id/archive')
  @RequireAutomationAction('manage_process')
  archive(@Param('id') id: string) {
    return this.processes.archive(id);
  }

  @Delete(':id')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.processes.remove(id);
  }

  @Post(':id/steps')
  @RequireAutomationAction('manage_process')
  addStep(@Param('id') id: string, @Body() dto: UpsertAutomationStepDto) {
    return this.processes.addStep(id, dto);
  }

  @Patch('steps/:stepId')
  @RequireAutomationAction('manage_process')
  updateStep(@Param('stepId') stepId: string, @Body() dto: UpsertAutomationStepDto) {
    return this.processes.updateStep(stepId, dto);
  }

  @Delete('steps/:stepId')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStep(@Param('stepId') stepId: string): Promise<void> {
    return this.processes.removeStep(stepId);
  }

  @Post(':id/fields')
  @RequireAutomationAction('manage_process')
  addField(@Param('id') id: string, @Body() dto: UpsertAutomationFieldDto) {
    return this.processes.addField(id, dto);
  }

  @Patch('fields/:fieldId')
  @RequireAutomationAction('manage_process')
  updateField(@Param('fieldId') fieldId: string, @Body() dto: UpsertAutomationFieldDto) {
    return this.processes.updateField(fieldId, dto);
  }

  @Delete('fields/:fieldId')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeField(@Param('fieldId') fieldId: string): Promise<void> {
    return this.processes.removeField(fieldId);
  }

  @Post(':id/rules')
  @RequireAutomationAction('manage_process')
  upsertRule(@Param('id') id: string, @Body() dto: UpsertAutomationRuleDto) {
    return this.processes.upsertRule(id, dto);
  }

  @Delete('rules/:ruleId')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRule(@Param('ruleId') ruleId: string): Promise<void> {
    return this.processes.removeRule(ruleId);
  }

  @Post(':id/templates')
  @RequireAutomationAction('manage_process')
  upsertTemplate(@Param('id') id: string, @Body() dto: UpsertAutomationTemplateDto) {
    return this.processes.upsertTemplate(id, dto);
  }

  @Delete('templates/:templateId')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeTemplate(@Param('templateId') templateId: string): Promise<void> {
    return this.processes.removeTemplate(templateId);
  }

  @Post(':id/checklist')
  @RequireAutomationAction('manage_process')
  addChecklistItem(@Param('id') id: string, @Body() dto: UpsertAutomationChecklistItemDto) {
    return this.processes.addChecklistItem(id, dto);
  }

  @Delete('checklist/:itemId')
  @RequireAutomationAction('manage_process')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeChecklistItem(@Param('itemId') itemId: string): Promise<void> {
    return this.processes.removeChecklistItem(itemId);
  }
}
