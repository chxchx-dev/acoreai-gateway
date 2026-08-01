import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { KnowledgeAuditService } from '../knowledge-audit.service';
import { chunkKnowledgeText } from './chunker.util';
import { extractPlainText } from './text-extractor.util';

@Injectable()
export class KnowledgeIngestionService {
  private readonly logger = new Logger(KnowledgeIngestionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: KnowledgeAuditService,
  ) {}

  // No hay cola real (BullMQ/Redis) todavía: el event loop de Node hace de cola
  // in-process. El request que crea la fuente no espera este trabajo.
  queueProcessing(sourceId: string, rawText: string): void {
    setImmediate(() => {
      this.process(sourceId, rawText).catch((err: unknown) => {
        this.logger.error(
          `Fallo procesando fuente ${sourceId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
  }

  async process(sourceId: string, rawText: string): Promise<void> {
    const extractJob = await this.prisma.knowledgeProcessingJob.create({
      data: { sourceId, jobType: 'extract_text', status: 'running', startedAt: new Date() },
    });

    let versionId: string;
    let extractedText: string;

    try {
      const extracted = extractPlainText(rawText);
      if (extracted.text.length === 0) {
        throw new Error('El documento no contiene texto extraíble');
      }
      extractedText = extracted.text;

      const textHash = createHash('sha256').update(extracted.text).digest('hex');
      const source = await this.prisma.knowledgeSource.findUniqueOrThrow({ where: { id: sourceId } });

      const version = await this.prisma.knowledgeSourceVersion.create({
        data: {
          sourceId,
          version: source.currentVersion,
          title: source.title,
          extractedText: extracted.text,
          textHash,
          status: 'extracted',
        },
      });
      versionId = version.id;

      await this.prisma.knowledgeSource.update({
        where: { id: sourceId },
        data: { status: 'extracted', checksum: textHash },
      });

      await this.prisma.knowledgeProcessingJob.update({
        where: { id: extractJob.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          versionId: version.id,
          metadata: {
            pagesDetected: extracted.pagesDetected,
            characters: extracted.characters,
            warnings: extracted.warnings,
          },
        },
      });

      await this.audit.log({
        entityType: 'knowledge_source',
        entityId: sourceId,
        action: 'source.extracted',
        newValue: { characters: extracted.characters, versionId: version.id },
      });
    } catch (err: unknown) {
      await this.prisma.knowledgeProcessingJob.update({
        where: { id: extractJob.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
          attempts: { increment: 1 },
        },
      });
      throw err;
    }

    await this.chunkAndPersist(sourceId, versionId, extractedText);
  }

  async chunkAndPersist(sourceId: string, versionId: string, text: string): Promise<void> {
    const chunkJob = await this.prisma.knowledgeProcessingJob.create({
      data: { sourceId, versionId, jobType: 'chunk_text', status: 'running', startedAt: new Date() },
    });

    try {
      const chunks = chunkKnowledgeText(text);
      if (chunks.length === 0) {
        throw new Error('No se generaron chunks: el texto extraído quedó vacío tras normalizar');
      }

      await this.prisma.$transaction([
        this.prisma.knowledgeChunk.deleteMany({ where: { versionId } }),
        this.prisma.knowledgeChunk.createMany({
          data: chunks.map((chunk) => ({
            sourceId,
            versionId,
            chunkIndex: chunk.chunkIndex,
            content: chunk.content,
            sectionTitle: chunk.sectionTitle,
            tokensCount: chunk.tokensCount,
            status: 'pending_review',
          })),
        }),
        this.prisma.knowledgeSourceVersion.update({
          where: { id: versionId },
          data: { status: 'chunked' },
        }),
        this.prisma.knowledgeSource.update({
          where: { id: sourceId },
          data: { status: 'pending_review' },
        }),
      ]);

      await this.prisma.knowledgeProcessingJob.update({
        where: { id: chunkJob.id },
        data: {
          status: 'completed',
          completedAt: new Date(),
          metadata: { chunksCreated: chunks.length },
        },
      });

      await this.audit.log({
        entityType: 'knowledge_source',
        entityId: sourceId,
        action: 'source.submitted_review',
        newValue: { chunksCreated: chunks.length },
      });
    } catch (err: unknown) {
      await this.prisma.knowledgeProcessingJob.update({
        where: { id: chunkJob.id },
        data: {
          status: 'failed',
          completedAt: new Date(),
          errorMessage: err instanceof Error ? err.message : String(err),
          attempts: { increment: 1 },
        },
      });
      throw err;
    }
  }
}
