import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { RagStoreService } from 'src/modules/rag/rag-store.service';
import { chunkText } from 'src/modules/rag/utils/chunk-text.util';
import { CreateDocumentDto } from 'src/interfaces/http/dto/documents/create-document.dto';

export interface DocumentIndexResult {
  id: string;
  title: string;
  chunksCreated: number;
  status: string;
}

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private readonly ragStore: RagStoreService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly config: ConfigService,
  ) {}

  async createFromText(dto: CreateDocumentDto): Promise<DocumentIndexResult> {
    const maxChunkChars = this.config.get<number>('MAX_CHUNK_CHARS', 1200);
    const chunks = chunkText(dto.content, maxChunkChars);

    if (chunks.length === 0) {
      throw new BadRequestException('El contenido no generó chunks válidos');
    }

    const document = await this.ragStore.createDocument({
      title: dto.title,
      source: dto.source,
      type: 'text',
    });

    let embeddings: number[][] = [];
    try {
      embeddings = await this.aiOrchestrator.createEmbedding(chunks);
    } catch (err: unknown) {
      this.logger.warn(
        `Embeddings no disponibles (${err instanceof Error ? err.message : String(err)}). Los chunks se guardarán sin vector.`,
      );
      embeddings = chunks.map(() => []);
    }

    const chunkRecords = chunks.map((content, i) => ({
      content,
      embedding: embeddings[i] ?? [],
    }));

    await this.ragStore.createChunks(
      document.id,
      document.title,
      chunkRecords,
      this.config.get<string>('OLLAMA_EMBEDDING_MODEL', 'embeddinggemma'),
    );

    this.logger.log(`Documento "${dto.title}" indexado: ${chunks.length} chunks`);

    return {
      id: document.id,
      title: document.title,
      chunksCreated: chunks.length,
      status: 'indexed',
    };
  }

  async findAll() {
    const docs = await this.ragStore.listDocuments();
    return docs.map((d) => ({
      id: d.id,
      title: d.title,
      type: d.type,
      source: d.source,
      createdAt: d.createdAt,
      _count: { chunks: d.chunkCount },
    }));
  }

  async findOne(id: string) {
    const doc = await this.ragStore.findDocumentWithChunks(id);
    return {
      id: doc.id,
      title: doc.title,
      type: doc.type,
      source: doc.source,
      createdAt: doc.createdAt,
      chunks: doc.chunks.map((c) => ({
        id: c.id,
        chunkIndex: c.chunkIndex,
        content: c.content,
      })),
    };
  }

  async remove(id: string): Promise<void> {
    await this.ragStore.deleteDocument(id);
  }
}
