import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { KnowledgeAuditService } from '../knowledge-audit.service';
import { computeSourceWarnings } from '../ingestion/warnings.util';
import { buildRagSystemPrompt } from './prompt.util';
import {
  CHAT_LOG_REPOSITORY_PORT,
  ChatLogRepositoryPort,
} from 'src/application/ports/chat-log-repository.port';

interface TestChunkRow {
  chunkId: string;
  content: string;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  similarity: number;
}

export interface TestQuestionResult {
  answer: string;
  sources: { title: string; page: number | null; section: string | null; score: number }[];
  chunksRetrieved: { chunkId: string; content: string; sectionTitle: string | null; score: number }[];
  warnings: string[];
}

@Injectable()
export class KnowledgeTestService {
  private readonly embeddingDimensions: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly audit: KnowledgeAuditService,
    private readonly config: ConfigService,
    @Inject(CHAT_LOG_REPOSITORY_PORT)
    private readonly logs: ChatLogRepositoryPort,
  ) {
    this.embeddingDimensions = Number(this.config.get('EMBEDDING_DIMENSIONS', 768));
  }

  async testQuestion(
    sourceId: string,
    question: string,
    model?: string,
    userId?: string,
  ): Promise<TestQuestionResult> {
    const startedAt = Date.now();
    const source = await this.prisma.knowledgeSource.findUnique({
      where: { id: sourceId },
      include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
    });
    if (!source) {
      throw new NotFoundException(`KnowledgeSource ${sourceId} no encontrado`);
    }

    const latestVersion = source.versions[0];
    if (!latestVersion) {
      throw new BadRequestException('Esta fuente todavía no tiene una versión procesada');
    }

    const chunks = await this.prisma.knowledgeChunk.findMany({
      where: { versionId: latestVersion.id },
      orderBy: { chunkIndex: 'asc' },
    });
    const warnings = computeSourceWarnings(source, latestVersion, chunks);

    const [queryEmbedding] = await this.aiOrchestrator.createEmbedding(question);
    if (!this.isValidEmbedding(queryEmbedding)) {
      throw new BadRequestException('No se pudo generar el embedding de la pregunta de prueba');
    }
    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const rows = await this.prisma.$queryRaw<TestChunkRow[]>`
      SELECT
        c."id" AS "chunkId",
        c."content" AS "content",
        c."sectionTitle" AS "sectionTitle",
        c."pageStart" AS "pageStart",
        c."pageEnd" AS "pageEnd",
        1 - (c."embedding" <=> ${vectorLiteral}::vector) AS "similarity"
      FROM "KnowledgeChunk" c
      WHERE c."versionId" = ${latestVersion.id}
        AND c."embedding" IS NOT NULL
      ORDER BY c."embedding" <=> ${vectorLiteral}::vector
      LIMIT 6
    `;

    const chunksRetrieved = rows.map((r) => ({
      chunkId: r.chunkId,
      content: r.content,
      sectionTitle: r.sectionTitle,
      score: r.similarity,
    }));

    if (rows.length === 0) {
      const noChunksAnswer =
        'No hay chunks con embeddings todavía para esta fuente (¿ya pasó por revisión y generación de embeddings?).';
      await this.logs.create({
        userId,
        source: 'rag_test',
        question,
        answer: noChunksAnswer,
        model: model ?? '',
        status: 'no_context',
        durationMs: Date.now() - startedAt,
        chunksUsed: 0,
      });
      return {
        answer: noChunksAnswer,
        sources: [],
        chunksRetrieved: [],
        warnings,
      };
    }

    const resolvedModel = model ? await this.aiOrchestrator.resolveModel(model) : null;
    if (model && !resolvedModel) {
      throw new BadRequestException(`El modelo "${model}" no está disponible en Ollama.`);
    }

    const contextBlocks = rows.map(
      (r, i) => `[Fragmento ${i + 1}${r.sectionTitle ? ` — ${r.sectionTitle}` : ''}]\n${r.content}`,
    );
    const systemPrompt = buildRagSystemPrompt(contextBlocks);

    let answer = '(Sin modelo especificado: solo se muestran los chunks recuperados.)';
    if (resolvedModel) {
      const chatResult = await this.aiOrchestrator.generate({
        model: resolvedModel,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: question },
        ],
      });
      answer = chatResult.content;
    }

    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: sourceId,
      action: 'source.test_question',
      newValue: { question },
      userId,
    });

    await this.logs.create({
      userId,
      source: 'rag_test',
      question,
      answer,
      model: resolvedModel ?? '',
      status: resolvedModel ? 'answered' : 'no_model',
      durationMs: Date.now() - startedAt,
      chunksUsed: rows.length,
      sources: rows.map((r) => ({ chunkId: r.chunkId, sectionTitle: r.sectionTitle, score: r.similarity })),
    });

    return {
      answer,
      sources: rows.map((r) => ({
        title: source.title,
        page: r.pageStart,
        section: r.sectionTitle,
        score: Number(r.similarity.toFixed(4)),
      })),
      chunksRetrieved,
      warnings,
    };
  }

  async recordFeedback(
    sourceId: string,
    feedback: 'correct' | 'insufficient',
    question: string,
    userId?: string,
  ): Promise<void> {
    await this.audit.log({
      entityType: 'knowledge_source',
      entityId: sourceId,
      action: 'source.test_feedback',
      newValue: { feedback, question },
      userId,
    });
  }

  private isValidEmbedding(embedding: number[] | undefined): embedding is number[] {
    return (
      Array.isArray(embedding) &&
      embedding.length === this.embeddingDimensions &&
      embedding.every((value) => Number.isFinite(value))
    );
  }
}
