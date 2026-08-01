import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import {
  VECTOR_STORE_PORT,
  VectorStorePort,
} from 'src/application/ports/vector-store.port';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';

export interface RagChunk {
  documentId: string;
  title: string;
  sourceUrl?: string;
  chunkId: string;
  chunkIndex: number;
  content: string;
  score: number;
}

export interface RagContextResult {
  chunks: RagChunk[];
  contextText: string;
}

const MIN_SIMILARITY_SCORE = 0.3;

@Injectable()
export class RagService {
  private readonly logger = new Logger(RagService.name);
  private readonly maxContextChunks: number;
  private readonly embeddingModel: string;

  constructor(
    @Inject(VECTOR_STORE_PORT)
    private readonly vectorStore: VectorStorePort,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {
    this.maxContextChunks = this.config.get<number>('MAX_CONTEXT_CHUNKS', 5);
    this.embeddingModel = this.config.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'embeddinggemma',
    );
  }

  async searchContext(question: string): Promise<RagContextResult> {
    const questionEmbeddings = await this.observability.measureStage(
      'rag.embedding',
      () => this.aiOrchestrator.createEmbedding(question),
    );
    const qVec = questionEmbeddings[0];

    if (!qVec || qVec.length === 0) {
      this.logger.warn('El modelo de embeddings devolvió un vector vacío');
      return { chunks: [], contextText: '' };
    }

    const scored = await this.observability.measureStage('rag.vector_search', () =>
      this.vectorStore.searchSimilarChunks({
        embedding: qVec,
        model: this.embeddingModel,
        limit: this.maxContextChunks,
        minScore: MIN_SIMILARITY_SCORE,
      }),
    );

    const chunks: RagChunk[] = scored.map((c) => ({
      documentId: c.documentId,
      title: c.docTitle,
      sourceUrl: c.docSource,
      chunkId: c.id,
      chunkIndex: c.chunkIndex,
      content: c.content,
      score: c.score ?? 0,
    }));
    const contextText = chunks.map((c) => c.content).join('\n\n');
    return { chunks, contextText };
  }
}
