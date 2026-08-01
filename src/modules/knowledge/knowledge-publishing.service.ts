import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ArchiveKnowledgeSourceDto } from 'src/interfaces/http/dto/knowledge/archive-knowledge-source.dto';
import { KnowledgeAuditService } from './knowledge-audit.service';

@Injectable()
export class KnowledgePublishingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: KnowledgeAuditService,
  ) {}

  async publish(sourceId: string, userId?: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${sourceId} no encontrado`);
    }

    if (source.status !== 'ready_to_publish') {
      throw new BadRequestException(
        `No se puede publicar: la fuente está en estado "${source.status}", debe estar en ready_to_publish (revisada, aprobada y con embeddings generados).`,
      );
    }

    const latestVersion = source.versions[0];
    if (!latestVersion) {
      throw new BadRequestException('La fuente no tiene ninguna versión para publicar');
    }

    if (!source.validFrom) {
      throw new BadRequestException('No se puede publicar sin una fecha de vigencia inicial (validFrom)');
    }

    if (!source.area) {
      throw new BadRequestException('No se puede publicar sin un área asignada');
    }

    const approvedReview = await this.prisma.knowledgeReview.findFirst({
      where: { sourceId, versionId: latestVersion.id, decision: 'approved' },
    });
    if (!approvedReview) {
      throw new BadRequestException('No existe una revisión aprobada para esta versión de la fuente');
    }

    const pendingEmbeddings = await this.prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(*)::bigint AS count
      FROM "KnowledgeChunk"
      WHERE "versionId" = ${latestVersion.id}
        AND "status" = 'approved'
        AND "embedding" IS NULL
    `;
    if (Number(pendingEmbeddings[0]?.count ?? 0) > 0) {
      throw new BadRequestException(
        'No se puede publicar: hay chunks aprobados sin embedding generado todavía',
      );
    }

    const now = new Date();

    // Si ya había una versión publicada de esta misma fuente (Fase 8: nueva
    // versión sobre una fuente existente), esa versión y sus chunks pasan a
    // archived — nunca se borra el historial, solo deja de ser la activa.
    const previousPublishedVersion = await this.prisma.knowledgeSourceVersion.findFirst({
      where: { sourceId, status: 'published', id: { not: latestVersion.id } },
    });

    await this.prisma.$transaction([
      this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: 'published', publishedBy: userId, publishedAt: now },
      }),
      this.prisma.knowledgeSourceVersion.update({
        where: { id: latestVersion.id },
        data: { status: 'published' },
      }),
      this.prisma.knowledgeChunk.updateMany({
        where: { versionId: latestVersion.id, status: 'approved' },
        data: { status: 'published', publishedAt: now },
      }),
      ...(previousPublishedVersion
        ? [
            this.prisma.knowledgeSourceVersion.update({
              where: { id: previousPublishedVersion.id },
              data: { status: 'archived' },
            }),
            this.prisma.knowledgeChunk.updateMany({
              where: { versionId: previousPublishedVersion.id },
              data: { status: 'archived' },
            }),
          ]
        : []),
    ]);

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: sourceId,
      action: 'source.published',
      newValue: { version: latestVersion.version, previousVersionArchived: previousPublishedVersion?.version ?? null },
      userId,
    });

    return this.prisma.knowledgeSource.findUniqueOrThrow({ where: { id: sourceId } });
  }

  async archive(sourceId: string, dto: ArchiveKnowledgeSourceDto, userId?: string) {
    const source = await this.prisma.knowledgeSource.findUnique({ where: { id: sourceId } });
    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${sourceId} no encontrado`);
    }

    if (source.status === 'archived') {
      throw new BadRequestException('Esta fuente ya está archivada');
    }

    const now = new Date();

    await this.prisma.$transaction([
      this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: 'archived', archivedAt: now },
      }),
      this.prisma.knowledgeChunk.updateMany({
        where: { sourceId },
        data: { status: 'archived' },
      }),
    ]);

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: sourceId,
      action: 'source.archived',
      newValue: { reason: dto.reason },
      userId,
    });

    return this.prisma.knowledgeSource.findUniqueOrThrow({ where: { id: sourceId } });
  }
}
