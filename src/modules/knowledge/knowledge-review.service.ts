import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { CreateKnowledgeReviewDto } from 'src/interfaces/http/dto/knowledge/create-knowledge-review.dto';
import { UpdateKnowledgeChunkDto } from 'src/interfaces/http/dto/knowledge/update-knowledge-chunk.dto';
import { KnowledgeAuditService } from './knowledge-audit.service';
import { KnowledgeEmbeddingsService } from './embeddings/knowledge-embeddings.service';

const REVIEWABLE_SOURCE_STATUSES = ['pending_review', 'needs_changes'] as const;
const EDITABLE_SOURCE_STATUSES = ['pending_review', 'needs_changes'] as const;

@Injectable()
export class KnowledgeReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: KnowledgeAuditService,
    private readonly embeddings: KnowledgeEmbeddingsService,
  ) {}

  async review(sourceId: string, dto: CreateKnowledgeReviewDto, reviewerId?: string) {
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });

    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${sourceId} no encontrado`);
    }

    if (!REVIEWABLE_SOURCE_STATUSES.includes(source.status as (typeof REVIEWABLE_SOURCE_STATUSES)[number])) {
      throw new BadRequestException(
        `No se puede revisar una fuente en estado "${source.status}". Debe estar en pending_review o needs_changes.`,
      );
    }

    const latestVersion = source.versions[0] ?? null;
    if (!reviewerId) {
      throw new BadRequestException('No se pudo identificar al revisor');
    }

    const review = await this.prisma.knowledgeReview.create({
      data: {
        sourceId,
        versionId: latestVersion?.id,
        reviewerId,
        decision: dto.decision,
        comments: dto.comments,
        checklist: dto.checklist ?? {},
      },
    });

    const now = new Date();

    if (dto.decision === 'approved') {
      await this.prisma.$transaction([
        this.prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { status: 'embedding_pending', reviewedBy: reviewerId, reviewedAt: now },
        }),
        ...(latestVersion
          ? [
              this.prisma.knowledgeChunk.updateMany({
                where: { versionId: latestVersion.id, status: { not: 'rejected' } },
                data: { status: 'approved', approvedBy: reviewerId, approvedAt: now },
              }),
              this.prisma.knowledgeProcessingJob.create({
                data: {
                  sourceId,
                  versionId: latestVersion.id,
                  jobType: 'generate_embeddings',
                  status: 'queued',
                },
              }),
            ]
          : []),
      ]);

      await this.audit.log({
        entityType: 'knowledge_source',
        entityId: sourceId,
        action: 'source.approved',
        newValue: { comments: dto.comments },
        userId: reviewerId,
      });

      if (latestVersion) {
        this.embeddings.queueGeneration(sourceId, latestVersion.id);
      }
    } else if (dto.decision === 'rejected') {
      await this.prisma.$transaction([
        this.prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { status: 'rejected', reviewedBy: reviewerId, reviewedAt: now },
        }),
        ...(latestVersion
          ? [
              this.prisma.knowledgeChunk.updateMany({
                where: { versionId: latestVersion.id },
                data: { status: 'rejected' },
              }),
            ]
          : []),
      ]);

      await this.audit.log({
        entityType: 'knowledge_source',
        entityId: sourceId,
        action: 'source.rejected',
        newValue: { comments: dto.comments },
        userId: reviewerId,
      });
    } else {
      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: 'needs_changes', reviewedBy: reviewerId, reviewedAt: now },
      });

      await this.audit.log({
        entityType: 'knowledge_source',
        entityId: sourceId,
        action: 'source.needs_changes',
        newValue: { comments: dto.comments },
        userId: reviewerId,
      });
    }

    return review;
  }

  private async loadEditableChunk(chunkId: string) {
    const chunk = await this.prisma.knowledgeChunk.findUnique({
      where: { id: chunkId },
      include: { source: true },
    });

    if (!chunk) {
      throw new NotFoundException(`KnowledgeChunk ${chunkId} no encontrado`);
    }

    if (!EDITABLE_SOURCE_STATUSES.includes(chunk.source.status as (typeof EDITABLE_SOURCE_STATUSES)[number])) {
      throw new BadRequestException(
        `No se puede modificar este chunk: la fuente está en estado "${chunk.source.status}", no en revisión. Crea una nueva versión en su lugar.`,
      );
    }

    return chunk;
  }

  async updateChunk(chunkId: string, dto: UpdateKnowledgeChunkDto, userId?: string) {
    const chunk = await this.loadEditableChunk(chunkId);

    const updated = await this.prisma.knowledgeChunk.update({
      where: { id: chunkId },
      data: {
        content: dto.content,
        sectionTitle: dto.sectionTitle,
        priority: dto.priority,
        validFrom: dto.validFrom ? new Date(dto.validFrom) : undefined,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : undefined,
      },
    });

    await this.audit.log({
      entityType: 'knowledge_chunk',
      entityId: chunkId,
      action: 'chunk.edited',
      oldValue: { content: chunk.content },
      newValue: { content: updated.content },
      userId,
    });

    return updated;
  }

  async deleteChunk(chunkId: string, userId?: string): Promise<void> {
    const chunk = await this.loadEditableChunk(chunkId);

    await this.prisma.knowledgeChunk.delete({ where: { id: chunkId } });

    await this.audit.log({
      entityType: 'knowledge_chunk',
      entityId: chunkId,
      action: 'chunk.deleted',
      oldValue: { content: chunk.content, sourceId: chunk.sourceId },
      userId,
    });
  }

  async approveChunk(chunkId: string, userId?: string) {
    const chunk = await this.loadEditableChunk(chunkId);

    const updated = await this.prisma.knowledgeChunk.update({
      where: { id: chunkId },
      data: { status: 'approved', approvedBy: userId, approvedAt: new Date() },
    });

    await this.audit.log({
      entityType: 'knowledge_chunk',
      entityId: chunkId,
      action: 'chunk.approved',
      userId,
    });

    return updated;
  }

  async rejectChunk(chunkId: string, userId?: string) {
    await this.loadEditableChunk(chunkId);

    const updated = await this.prisma.knowledgeChunk.update({
      where: { id: chunkId },
      data: { status: 'rejected' },
    });

    await this.audit.log({
      entityType: 'knowledge_chunk',
      entityId: chunkId,
      action: 'chunk.rejected',
      userId,
    });

    return updated;
  }
}
