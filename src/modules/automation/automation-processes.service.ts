import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateAutomationProcessDto } from 'src/interfaces/http/dto/automation/create-automation-process.dto';
import { UpdateAutomationProcessDto } from 'src/interfaces/http/dto/automation/update-automation-process.dto';
import { UpsertAutomationStepDto } from 'src/interfaces/http/dto/automation/upsert-automation-step.dto';
import { UpsertAutomationFieldDto } from 'src/interfaces/http/dto/automation/upsert-automation-field.dto';
import { UpsertAutomationRuleDto } from 'src/interfaces/http/dto/automation/upsert-automation-rule.dto';
import { UpsertAutomationTemplateDto } from 'src/interfaces/http/dto/automation/upsert-automation-template.dto';
import { UpsertAutomationChecklistItemDto } from 'src/interfaces/http/dto/automation/upsert-automation-checklist-item.dto';

@Injectable()
export class AutomationProcessesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateAutomationProcessDto, createdBy?: string) {
    const existing = await this.prisma.automationProcess.findUnique({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`Ya existe un proceso con el slug "${dto.slug}"`);
    }

    return this.prisma.automationProcess.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        platform: dto.platform ?? 'olan',
        role: dto.role,
        objective: dto.objective,
        requiredInputs: dto.requiredInputs ?? [],
        optionalInputs: dto.optionalInputs ?? [],
        restrictions: dto.restrictions ?? [],
        createdBy,
      },
    });
  }

  findAll() {
    return this.prisma.automationProcess.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const process = await this.prisma.automationProcess.findUnique({
      where: { id },
      include: {
        steps: { orderBy: { order: 'asc' } },
        fields: { orderBy: { order: 'asc' } },
        rules: { orderBy: { categoria: 'asc' } },
        templates: { orderBy: { name: 'asc' } },
        checklist: { orderBy: [{ momento: 'asc' }, { order: 'asc' }] },
        logs: { orderBy: { startedAt: 'desc' }, take: 20 },
      },
    });

    if (!process) {
      throw new NotFoundException(`AutomationProcess ${id} no encontrado`);
    }

    return process;
  }

  private async requireProcess(id: string) {
    const process = await this.prisma.automationProcess.findUnique({ where: { id } });
    if (!process) {
      throw new NotFoundException(`AutomationProcess ${id} no encontrado`);
    }
    return process;
  }

  async update(id: string, dto: UpdateAutomationProcessDto) {
    await this.requireProcess(id);
    return this.prisma.automationProcess.update({
      where: { id },
      data: {
        name: dto.name,
        role: dto.role,
        objective: dto.objective,
        requiredInputs: dto.requiredInputs,
        optionalInputs: dto.optionalInputs,
        restrictions: dto.restrictions,
      },
    });
  }

  async publish(id: string) {
    await this.requireProcess(id);
    return this.prisma.automationProcess.update({ where: { id }, data: { status: 'published' } });
  }

  async archive(id: string) {
    await this.requireProcess(id);
    return this.prisma.automationProcess.update({ where: { id }, data: { status: 'archived' } });
  }

  async remove(id: string): Promise<void> {
    await this.requireProcess(id);
    await this.prisma.automationProcess.delete({ where: { id } });
  }

  // ── Pasos ──────────────────────────────────────────────────────────────
  async addStep(processId: string, dto: UpsertAutomationStepDto) {
    await this.requireProcess(processId);
    const order = dto.order ?? (await this.prisma.automationStep.count({ where: { processId } })) + 1;
    return this.prisma.automationStep.create({ data: { processId, key: dto.key, label: dto.label, order } });
  }

  async updateStep(stepId: string, dto: UpsertAutomationStepDto) {
    await this.requireStep(stepId);
    return this.prisma.automationStep.update({
      where: { id: stepId },
      data: { key: dto.key, label: dto.label, order: dto.order },
    });
  }

  async removeStep(stepId: string): Promise<void> {
    await this.requireStep(stepId);
    await this.prisma.automationStep.delete({ where: { id: stepId } });
  }

  private async requireStep(stepId: string) {
    const step = await this.prisma.automationStep.findUnique({ where: { id: stepId } });
    if (!step) throw new NotFoundException(`Paso ${stepId} no encontrado`);
    return step;
  }

  // ── Campos ─────────────────────────────────────────────────────────────
  async addField(processId: string, dto: UpsertAutomationFieldDto) {
    await this.requireProcess(processId);
    const order = dto.order ?? (await this.prisma.automationField.count({ where: { processId } })) + 1;
    return this.prisma.automationField.create({
      data: {
        processId,
        key: dto.key,
        tipo: dto.tipo,
        requerido: dto.requerido ?? false,
        maxCaracteres: dto.maxCaracteres,
        opciones: dto.opciones as never,
        order,
      },
    });
  }

  async updateField(fieldId: string, dto: UpsertAutomationFieldDto) {
    await this.requireField(fieldId);
    return this.prisma.automationField.update({
      where: { id: fieldId },
      data: {
        key: dto.key,
        tipo: dto.tipo,
        requerido: dto.requerido,
        maxCaracteres: dto.maxCaracteres,
        opciones: dto.opciones as never,
        order: dto.order,
      },
    });
  }

  async removeField(fieldId: string): Promise<void> {
    await this.requireField(fieldId);
    await this.prisma.automationField.delete({ where: { id: fieldId } });
  }

  private async requireField(fieldId: string) {
    const field = await this.prisma.automationField.findUnique({ where: { id: fieldId } });
    if (!field) throw new NotFoundException(`Campo ${fieldId} no encontrado`);
    return field;
  }

  // ── Reglas ─────────────────────────────────────────────────────────────
  async upsertRule(processId: string, dto: UpsertAutomationRuleDto) {
    await this.requireProcess(processId);
    return this.prisma.automationRule.upsert({
      where: { processId_categoria: { processId, categoria: dto.categoria } },
      create: { processId, categoria: dto.categoria, reglas: dto.reglas as never },
      update: { reglas: dto.reglas as never },
    });
  }

  async removeRule(ruleId: string): Promise<void> {
    const rule = await this.prisma.automationRule.findUnique({ where: { id: ruleId } });
    if (!rule) throw new NotFoundException(`Regla ${ruleId} no encontrada`);
    await this.prisma.automationRule.delete({ where: { id: ruleId } });
  }

  // ── Plantillas de payload ───────────────────────────────────────────────
  async upsertTemplate(processId: string, dto: UpsertAutomationTemplateDto) {
    await this.requireProcess(processId);
    return this.prisma.automationPayloadTemplate.upsert({
      where: { processId_name: { processId, name: dto.name } },
      create: { processId, name: dto.name, payload: dto.payload as never },
      update: { payload: dto.payload as never },
    });
  }

  async removeTemplate(templateId: string): Promise<void> {
    const template = await this.prisma.automationPayloadTemplate.findUnique({ where: { id: templateId } });
    if (!template) throw new NotFoundException(`Plantilla ${templateId} no encontrada`);
    await this.prisma.automationPayloadTemplate.delete({ where: { id: templateId } });
  }

  // ── Checklist de validación ─────────────────────────────────────────────
  async addChecklistItem(processId: string, dto: UpsertAutomationChecklistItemDto) {
    await this.requireProcess(processId);
    const order =
      dto.order ??
      (await this.prisma.automationChecklistItem.count({ where: { processId, momento: dto.momento } })) + 1;
    return this.prisma.automationChecklistItem.create({
      data: { processId, momento: dto.momento, label: dto.label, order },
    });
  }

  async removeChecklistItem(itemId: string): Promise<void> {
    const item = await this.prisma.automationChecklistItem.findUnique({ where: { id: itemId } });
    if (!item) throw new NotFoundException(`Item de checklist ${itemId} no encontrado`);
    await this.prisma.automationChecklistItem.delete({ where: { id: itemId } });
  }
}
