import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { KnowledgeSearchService } from 'src/modules/knowledge/retrieval/knowledge-search.service';

export interface RagChunk {
  documentId: string;
  title: string;
  sourceUrl?: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  score: number;
  page: number | null;
  section: string | null;
}

export interface RagContextResult {
  chunks: RagChunk[];
  contextText: string;
}

@Injectable()
export class RagService {
  private readonly maxContextChunks: number;

  constructor(
    private readonly knowledgeSearch: KnowledgeSearchService,
    private readonly config: ConfigService,
  ) {
    this.maxContextChunks = this.config.get<number>('MAX_CONTEXT_CHUNKS', 5);
  }

  async searchContext(
    question: string,
    userId?: string,
    area?: string,
    language?: string,
  ): Promise<RagContextResult> {
    const scored = await this.knowledgeSearch.search({
      query: question,
      topK: this.maxContextChunks,
      userId,
      area,
      language,
    });

    const chunks: RagChunk[] = scored.map((c) => ({
      documentId: c.sourceId,
      title: c.title,
      sourceUrl: c.sourceUrl ?? undefined,
      chunkId: c.chunkId,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: c.similarity,
      page: c.pageStart,
      section: c.sectionTitle,
    }));
    const contextText = chunks.map((c) => c.content).join('\n\n');
    return { chunks, contextText };
  }
}
