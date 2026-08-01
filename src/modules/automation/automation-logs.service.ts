import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateAutomationLogDto } from 'src/interfaces/http/dto/automation/create-automation-log.dto';

@Injectable()
export class AutomationLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(processId: string) {
    const process = await this.prisma.automationProcess.findUnique({ where: { id: processId } });
    if (!process) throw new NotFoundException(`AutomationProcess ${processId} no encontrado`);

    return this.prisma.automationExecutionLog.findMany({
      where: { processId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async create(processId: string, dto: CreateAutomationLogDto, executedBy?: string) {
    const process = await this.prisma.automationProcess.findUnique({ where: { id: processId } });
    if (!process) throw new NotFoundException(`AutomationProcess ${processId} no encontrado`);

    return this.prisma.automationExecutionLog.create({
      data: {
        processId,
        status: dto.status ?? 'pending',
        inputPayload: dto.inputPayload as never,
        outputSummary: dto.outputSummary as never,
        errorMessage: dto.errorMessage,
        executedBy,
        completedAt: dto.status && dto.status !== 'pending' ? new Date() : undefined,
      },
    });
  }

  async remove(logId: string): Promise<void> {
    const log = await this.prisma.automationExecutionLog.findUnique({ where: { id: logId } });
    if (!log) throw new NotFoundException(`Log ${logId} no encontrado`);
    await this.prisma.automationExecutionLog.delete({ where: { id: logId } });
  }
}
