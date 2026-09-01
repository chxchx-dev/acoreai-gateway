import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';

export interface KnowledgeSearchResult {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  title: string;
  sourceUrl: string | null;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  area: string | null;
  score: number;
  similarity: number;
  content: string;
}

interface RawSearchRow {
  chunkId: string;
  sourceId: string;
  chunkIndex: number;
  content: string;
  sectionTitle: string | null;
  pageStart: number | null;
  pageEnd: number | null;
  title: string;
  sourceUrl: string | null;
  area: string | null;
  priority: number;
  publishedAt: Date | null;
  similarity: number;
}

const FRESHNESS_WINDOW_DAYS = 365;

@Injectable()
export class KnowledgeSearchService {
  private readonly logger = new Logger(KnowledgeSearchService.name);
  private readonly embeddingDimensions: number;
  private readonly defaultTopK: number;
  private readonly minScore: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly config: ConfigService,
  ) {
    this.embeddingDimensions = Number(this.config.get('EMBEDDING_DIMENSIONS', 768));
    this.defaultTopK = Number(this.config.get('RAG_TOP_K', 6));
    this.minScore = Number(this.config.get('RAG_MIN_SCORE', 0.35));
  }

  async search(params: {
    query: string;
    area?: string;
    language?: string;
    topK?: number;
    userId?: string;
  }): Promise<KnowledgeSearchResult[]> {
    const start = Date.now();
    const topK = params.topK ?? this.defaultTopK;

    const [queryEmbedding] = await this.aiOrchestrator.createEmbedding(params.query);
    if (!this.isValidEmbedding(queryEmbedding)) {
      this.logger.warn('El modelo de embeddings devolvió un vector inválido para la búsqueda');
      await this.logSearch(params, topK, 0, Date.now() - start, params.userId);
      return [];
    }

    const vectorLiteral = `[${queryEmbedding.join(',')}]`;

    const rows = await this.prisma.$queryRaw<RawSearchRow[]>`
      SELECT
        c."id" AS "chunkId",
        c."sourceId" AS "sourceId",
        c."chunkIndex" AS "chunkIndex",
        c."content" AS "content",
        c."sectionTitle" AS "sectionTitle",
        c."pageStart" AS "pageStart",
        c."pageEnd" AS "pageEnd",
        s."title" AS "title",
        s."fileUrl" AS "sourceUrl",
        s."area" AS "area",
        s."priority" AS "priority",
        s."publishedAt" AS "publishedAt",
        1 - (c."embedding" <=> ${vectorLiteral}::vector) AS "similarity"
      FROM "KnowledgeChunk" c
      INNER JOIN "KnowledgeSource" s ON s."id" = c."sourceId"
      INNER JOIN "KnowledgeSourceVersion" v ON v."id" = c."versionId"
      WHERE c."status" = 'published'
        AND s."status" = 'published'
        AND v."status" = 'published'
        AND c."embedding" IS NOT NULL
        AND (c."validFrom" IS NULL OR c."validFrom" <= CURRENT_DATE)
        AND (c."validUntil" IS NULL OR c."validUntil" >= CURRENT_DATE)
        AND (s."validFrom" IS NULL OR s."validFrom" <= CURRENT_DATE)
        AND (s."validUntil" IS NULL OR s."validUntil" >= CURRENT_DATE)
        AND (${params.area ?? null}::text IS NULL OR s."area" = ${params.area ?? null})
        AND (${params.language ?? null}::text IS NULL OR s."language" = ${params.language ?? null})
      ORDER BY c."embedding" <=> ${vectorLiteral}::vector
      LIMIT ${topK * 3}
    `;

    const results = rows
      .filter((row) => row.similarity >= this.minScore)
      .map((row) => this.toResult(row, params.area))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    await this.logSearch(params, topK, results.length, Date.now() - start, params.userId);

    return results;
  }

  async listUnanswered(page = 1, pageSize = 50) {
    const size = Math.min(pageSize, 200);
    const where = { resultCount: 0 };

    const [items, total] = await Promise.all([
      this.prisma.knowledgeSearchLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * size,
        take: size,
      }),
      this.prisma.knowledgeSearchLog.count({ where }),
    ]);

    return { items, total, page, pageSize: size };
  }

  private toResult(row: RawSearchRow, areaFilter?: string): KnowledgeSearchResult {
    const priorityNorm = Math.min(Math.max(row.priority, 0), 100) / 100;
    const daysSincePublished = row.publishedAt
      ? (Date.now() - row.publishedAt.getTime()) / (1000 * 60 * 60 * 24)
      : FRESHNESS_WINDOW_DAYS;
    const freshness = Math.max(0, 1 - daysSincePublished / FRESHNESS_WINDOW_DAYS);
    const areaMatch = areaFilter && row.area === areaFilter ? 1 : 0;

    const score =
      row.similarity * 0.7 + priorityNorm * 0.15 + freshness * 0.1 + areaMatch * 0.05;

    return {
      chunkId: row.chunkId,
      sourceId: row.sourceId,
      chunkIndex: row.chunkIndex,
      title: row.title,
      sourceUrl: row.sourceUrl,
      sectionTitle: row.sectionTitle,
      pageStart: row.pageStart,
      pageEnd: row.pageEnd,
      area: row.area,
      similarity: row.similarity,
      score,
      content: row.content,
    };
  }

  private isValidEmbedding(embedding: number[] | undefined): embedding is number[] {
    return (
      Array.isArray(embedding) &&
      embedding.length === this.embeddingDimensions &&
      embedding.every((value) => Number.isFinite(value))
    );
  }

  private async logSearch(
    params: { query: string; area?: string; language?: string },
    topK: number,
    resultCount: number,
    latencyMs: number,
    userId?: string,
  ): Promise<void> {
    await this.prisma.knowledgeSearchLog.create({
      data: {
        userId,
        query: params.query,
        filters: { area: params.area ?? null, language: params.language ?? null },
        topK,
        resultCount,
        latencyMs,
      },
    });
  }
}
