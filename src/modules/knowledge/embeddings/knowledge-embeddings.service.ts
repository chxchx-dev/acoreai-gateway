import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { KnowledgeAuditService } from '../knowledge-audit.service';

const MAX_ATTEMPTS = 2;

@Injectable()
export class KnowledgeEmbeddingsService {
  private readonly logger = new Logger(KnowledgeEmbeddingsService.name);
  private readonly embeddingDimensions: number;
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly audit: KnowledgeAuditService,
    private readonly config: ConfigService,
  ) {
    this.embeddingDimensions = this.config.get<number>('EMBEDDING_DIMENSIONS', 768);
    this.embeddingModel = this.config.get<string>('OLLAMA_EMBEDDING_MODEL', 'embeddinggemma');
  }

  // Igual que la ingesta: sin cola real, el event loop hace de worker in-process.
  queueGeneration(sourceId: string, versionId: string): void {
    setImmediate(() => {
      this.generate(sourceId, versionId).catch((err: unknown) => {
        this.logger.error(
          `Fallo generando embeddings para fuente ${sourceId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
  }

  async generate(sourceId: string, versionId: string): Promise<void> {
    const source = await this.prisma.knowledgeSource.findUnique({ where: { id: sourceId } });
    if (!source || source.status !== 'embedding_pending') {
      this.logger.warn(
        `Se pidió generar embeddings para ${sourceId} pero su estado es "${source?.status}", se ignora`,
      );
      return;
    }

    const job = await this.prisma.knowledgeProcessingJob.findFirst({
      where: { sourceId, versionId, jobType: 'generate_embeddings', status: 'queued' },
      orderBy: { createdAt: 'desc' },
    });

    if (job) {
      await this.prisma.knowledgeProcessingJob.update({
        where: { id: job.id },
        data: { status: 'running', startedAt: new Date() },
      });
    }

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { versionId, status: 'approved' },
      orderBy: { chunkIndex: 'asc' },
    });

    if (chunks.length === 0) {
      if (job) {
        await this.prisma.knowledgeProcessingJob.update({
          where: { id: job.id },
          data: { status: 'failed', completedAt: new Date(), errorMessage: 'No hay chunks aprobados para embeder' },
        });
      }
      return;
    }

    let embeddings: number[][] = [];
    let lastError: unknown;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        embeddings = await this.aiOrchestrator.createEmbedding(chunks.map((c) => c.content));
        lastError = undefined;
        break;
      } catch (err: unknown) {
        lastError = err;
        this.logger.warn(
          `Intento ${attempt}/${MAX_ATTEMPTS} de embeddings falló para fuente ${sourceId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    if (lastError) {
      await this.prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: 'embedding_failed' } });
      if (job) {
        await this.prisma.knowledgeProcessingJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            attempts: MAX_ATTEMPTS,
            errorMessage: lastError instanceof Error ? lastError.message : String(lastError),
          },
        });
      }
      return;
    }

    let embedded = 0;
    for (let i = 0; i < chunks.length; i++) {
      const vector: number[] | undefined = embeddings[i];
      const vectorLength = vector?.length ?? 0;
      if (!this.isValidEmbedding(vector)) {
        this.logger.warn(`Embedding inválido para chunk ${chunks[i].id} (${vectorLength} dims)`);
        continue;
      }

      await this.prisma.$executeRaw`
        UPDATE "KnowledgeChunk"
        SET "embedding" = ${this.toVectorLiteral(vector)}::vector, "embeddingModel" = ${this.embeddingModel}
        WHERE "id" = ${chunks[i].id}
      `;
      embedded++;
    }

    if (embedded < chunks.length) {
      await this.prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: 'embedding_failed' } });
      if (job) {
        await this.prisma.knowledgeProcessingJob.update({
          where: { id: job.id },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: `Solo ${embedded}/${chunks.length} chunks recibieron un embedding válido`,
          },
        });
      }
      return;
    }

    await this.prisma.knowledgeSource.update({ where: { id: sourceId }, data: { status: 'ready_to_publish' } });
    if (job) {
      await this.prisma.knowledgeProcessingJob.update({
        where: { id: job.id },
        data: { status: 'completed', completedAt: new Date(), metadata: { chunksEmbedded: embedded } },
      });
    }

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: sourceId,
      action: 'embedding.generated',
      newValue: { chunksEmbedded: embedded, model: this.embeddingModel },
    });
  }

  private isValidEmbedding(embedding: number[] | undefined): embedding is number[] {
    return (
      Array.isArray(embedding) &&
      embedding.length === this.embeddingDimensions &&
      embedding.every((value) => Number.isFinite(value))
    );
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}
