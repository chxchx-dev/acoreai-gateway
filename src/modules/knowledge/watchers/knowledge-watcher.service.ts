import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { createHash } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { KnowledgeAuditService } from '../knowledge-audit.service';
import { KnowledgeSourcesService } from '../knowledge-sources.service';
import { assertUrlAllowed, fetchUrlContent } from './url-fetcher.util';

function cronJobName(watcherId: string): string {
  return `knowledge-watcher:${watcherId}`;
}

@Injectable()
export class KnowledgeWatcherService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeWatcherService.name);
  private readonly allowedDomains: string[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: KnowledgeAuditService,
    private readonly sourcesService: KnowledgeSourcesService,
    private readonly schedulerRegistry: SchedulerRegistry,
    private readonly config: ConfigService,
  ) {
    this.allowedDomains = (this.config.get<string>('KNOWLEDGE_WATCHER_ALLOWED_DOMAINS') ?? '')
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
  }

  async onModuleInit(): Promise<void> {
    const activeWatchers = await this.prisma.knowledgeWatcher.findMany({ where: { status: 'active' } });
    for (const watcher of activeWatchers) {
      this.registerCronJob(watcher.id, watcher.scheduleCron);
    }
    this.logger.log(`${activeWatchers.length} watcher(s) activo(s) registrados al iniciar`);
  }

  private registerCronJob(watcherId: string, scheduleCron: string): void {
    const name = cronJobName(watcherId);
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }

    const job = new CronJob(scheduleCron, () => {
      this.checkWatcher(watcherId).catch((err: unknown) => {
        this.logger.error(`Fallo revisando watcher ${watcherId}: ${err instanceof Error ? err.message : String(err)}`);
      });
    });

    this.schedulerRegistry.addCronJob(name, job);
    job.start();
  }

  private unregisterCronJob(watcherId: string): void {
    const name = cronJobName(watcherId);
    if (this.schedulerRegistry.doesExist('cron', name)) {
      this.schedulerRegistry.deleteCronJob(name);
    }
  }

  async create(dto: { name: string; sourceId: string; targetUrl: string; scheduleCron: string }, userId?: string) {
    if (this.allowedDomains.length === 0) {
      throw new BadRequestException(
        'No hay dominios autorizados configurados (KNOWLEDGE_WATCHER_ALLOWED_DOMAINS). No se pueden crear watchers de URL.',
      );
    }

    assertUrlAllowed(dto.targetUrl, this.allowedDomains);

    try {
      new CronJob(dto.scheduleCron, () => {});
    } catch {
      throw new BadRequestException(`"${dto.scheduleCron}" no es una expresión cron válida`);
    }

    const source = await this.prisma.knowledgeSource.findUnique({ where: { id: dto.sourceId } });
    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${dto.sourceId} no encontrado`);
    }

    const watcher = await this.prisma.knowledgeWatcher.create({
      data: {
        name: dto.name,
        sourceId: dto.sourceId,
        targetUrl: dto.targetUrl,
        scheduleCron: dto.scheduleCron,
        createdBy: userId,
      },
    });

    this.registerCronJob(watcher.id, watcher.scheduleCron);

    await this.audit.log({
      entityType: 'knowledge_watcher',
      entityId: watcher.id,
      action: 'watcher.created',
      newValue: { name: watcher.name, targetUrl: watcher.targetUrl, sourceId: watcher.sourceId },
      userId,
    });

    return watcher;
  }

  list() {
    return this.prisma.knowledgeWatcher.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const watcher = await this.prisma.knowledgeWatcher.findUnique({ where: { id } });
    if (!watcher) throw new NotFoundException(`KnowledgeWatcher ${id} no encontrado`);
    return watcher;
  }

  async setStatus(id: string, status: 'active' | 'paused', userId?: string) {
    const watcher = await this.findOne(id);
    const updated = await this.prisma.knowledgeWatcher.update({ where: { id }, data: { status } });

    if (status === 'active') {
      this.registerCronJob(id, watcher.scheduleCron);
    } else {
      this.unregisterCronJob(id);
    }

    await this.audit.log({
      entityType: 'knowledge_watcher',
      entityId: id,
      action: status === 'active' ? 'watcher.resumed' : 'watcher.paused',
      userId,
    });

    return updated;
  }

  async remove(id: string, userId?: string): Promise<void> {
    await this.findOne(id);
    this.unregisterCronJob(id);
    await this.prisma.knowledgeWatcher.delete({ where: { id } });

    await this.audit.log({
      entityType: 'knowledge_watcher',
      entityId: id,
      action: 'watcher.deleted',
      userId,
    });
  }

  // Nunca publica: como mucho deja la fuente en pending_review (a través de
  // createNewVersion, que reusa el mismo pipeline de ingesta supervisado).
  async checkWatcher(id: string): Promise<{ changed: boolean; message: string }> {
    const watcher = await this.findOne(id);
    const url = assertUrlAllowed(watcher.targetUrl, this.allowedDomains);

    const { text } = await fetchUrlContent(url);
    const checksum = createHash('sha256').update(text.trim()).digest('hex');

    await this.prisma.knowledgeWatcher.update({
      where: { id },
      data: { lastCheckedAt: new Date() },
    });

    if (checksum === watcher.lastChecksum) {
      return { changed: false, message: 'Sin cambios desde la última revisión' };
    }

    await this.prisma.knowledgeWatcher.update({ where: { id }, data: { lastChecksum: checksum } });

    await this.audit.log({
      entityType: 'knowledge_watcher',
      entityId: id,
      action: 'watcher.change_detected',
      newValue: { sourceId: watcher.sourceId },
    });

    const result = await this.sourcesService.createNewVersion(watcher.sourceId, text);

    return {
      changed: true,
      message: `Cambio detectado: se creó la versión ${result.version} en pending_review para revisión humana.`,
    };
  }
}
