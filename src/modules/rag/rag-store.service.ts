import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { RagChunk } from 'src/domain/rag/rag-chunk';

export interface RagDocument {
  id: string;
  title: string;
  source?: string;
  type: string;
  createdAt: string;
}

/** Alias local: la forma canónica vive en src/domain/rag/rag-chunk.ts. */
export type RagChunkRecord = RagChunk;

export interface RagDocumentWithChunks extends RagDocument {
  chunks: Omit<RagChunkRecord, 'docTitle' | 'score'>[];
}

interface DocumentRow {
  id: string;
  title: string;
  source: string | null;
  type: string;
  createdAt: Date;
}

interface ChunkSearchRow {
  id: string;
  documentId: string;
  docTitle: string;
  docSource: string | null;
  chunkIndex: number;
  content: string;
  score: number;
}

@Injectable()
export class RagStoreService {
  private readonly logger = new Logger(RagStoreService.name);
  private readonly embeddingDimensions: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.embeddingDimensions = this.config.get<number>('EMBEDDING_DIMENSIONS', 768);
  }

  async createDocument(data: {
    title: string;
    source?: string;
    type?: string;
  }): Promise<RagDocument> {
    const doc = await this.prisma.aiDocument.create({
      data: {
        title: data.title,
        source: data.source,
        type: data.type ?? 'text',
      },
    });

    return this.toDocument(doc);
  }

  async deleteDocument(id: string): Promise<void> {
    const doc = await this.findDocument(id);
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);

    await this.prisma.aiDocument.delete({ where: { id } });
    this.logger.log(`Documento "${doc.title}" eliminado`);
  }

  async findDocument(id: string): Promise<RagDocument | undefined> {
    const doc = await this.prisma.aiDocument.findUnique({ where: { id } });
    return doc ? this.toDocument(doc) : undefined;
  }

  async findDocumentOrFail(id: string): Promise<RagDocument> {
    const doc = await this.findDocument(id);
    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);
    return doc;
  }

  async listDocuments(): Promise<(RagDocument & { chunkCount: number })[]> {
    const docs = await this.prisma.aiDocument.findMany({
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { chunks: true } } },
    });

    return docs.map((doc) => ({
      ...this.toDocument(doc),
      chunkCount: doc._count.chunks,
    }));
  }

  async findDocumentWithChunks(id: string): Promise<RagDocumentWithChunks> {
    const doc = await this.prisma.aiDocument.findUnique({
      where: { id },
      include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    });

    if (!doc) throw new NotFoundException(`Documento ${id} no encontrado`);

    return {
      ...this.toDocument(doc),
      chunks: doc.chunks.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        chunkIndex: chunk.chunkIndex,
        content: chunk.content,
      })),
    };
  }

  async createChunks(
    documentId: string,
    _docTitle: string,
    chunks: { content: string; embedding: number[] }[],
    embeddingModel?: string,
  ): Promise<void> {
    const model = embeddingModel ?? this.config.get<string>('OLLAMA_EMBEDDING_MODEL', '');

    await this.prisma.$transaction(async (tx) => {
      for (let i = 0; i < chunks.length; i++) {
        const { content, embedding } = chunks[i];
        const chunk = await tx.aiDocumentChunk.create({
          data: {
            documentId,
            chunkIndex: i,
            content,
          },
        });

        if (!this.isValidEmbedding(embedding)) {
          this.logger.warn(
            `Chunk ${chunk.id} guardado sin embedding válido (${embedding.length}/${this.embeddingDimensions})`,
          );
          continue;
        }

        await tx.$executeRaw`
          INSERT INTO "AiDocumentEmbedding" ("id", "chunkId", "model", "dimensions", "embedding")
          VALUES (
            ${randomUUID()},
            ${chunk.id},
            ${model},
            ${this.embeddingDimensions},
            ${this.toVectorLiteral(embedding)}::vector
          )
        `;
      }
    });
  }

  async searchSimilarChunks(input: {
    embedding: number[];
    model: string;
    limit: number;
    minScore: number;
  }): Promise<RagChunkRecord[]> {
    if (!this.isValidEmbedding(input.embedding)) {
      this.logger.warn(
        `Embedding de búsqueda inválido (${input.embedding.length}/${this.embeddingDimensions})`,
      );
      return [];
    }

    const rows = await this.prisma.$queryRaw<ChunkSearchRow[]>`
      SELECT
        c."id",
        c."documentId",
        d."title" AS "docTitle",
        d."source" AS "docSource",
        c."chunkIndex",
        c."content",
        1 - (e."embedding" <=> ${this.toVectorLiteral(input.embedding)}::vector) AS "score"
      FROM "AiDocumentEmbedding" e
      INNER JOIN "AiDocumentChunk" c ON c."id" = e."chunkId"
      INNER JOIN "AiDocument" d ON d."id" = c."documentId"
      WHERE e."model" = ${input.model}
        AND e."dimensions" = ${this.embeddingDimensions}
      ORDER BY e."embedding" <=> ${this.toVectorLiteral(input.embedding)}::vector
      LIMIT ${input.limit}
    `;

    return rows
      .filter((row) => Number(row.score) >= input.minScore)
      .map((row) => ({
        id: row.id,
        documentId: row.documentId,
        docTitle: row.docTitle,
        docSource: row.docSource ?? undefined,
        chunkIndex: row.chunkIndex,
        content: row.content,
        score: Number(row.score),
      }));
  }

  private toDocument(doc: DocumentRow): RagDocument {
    return {
      id: doc.id,
      title: doc.title,
      source: doc.source ?? undefined,
      type: doc.type,
      createdAt: doc.createdAt.toISOString(),
    };
  }

  private isValidEmbedding(embedding: number[]): boolean {
    return (
      embedding.length === this.embeddingDimensions &&
      embedding.every((value) => Number.isFinite(value))
    );
  }

  private toVectorLiteral(embedding: number[]): string {
    return `[${embedding.join(',')}]`;
  }
}
