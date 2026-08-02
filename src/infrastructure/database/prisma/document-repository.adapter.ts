import { Injectable } from '@nestjs/common';
import { RagStoreService } from 'src/modules/rag/rag-store.service';
import { DocumentRepositoryPort } from 'src/application/ports/document-repository.port';
import { RagDocument, RagDocumentWithChunks } from 'src/domain/rag/rag-document';

@Injectable()
export class DocumentRepositoryAdapter implements DocumentRepositoryPort {
  constructor(private readonly ragStore: RagStoreService) {}

  createDocument(data: { title: string; source?: string; type?: string }): Promise<RagDocument> {
    return this.ragStore.createDocument(data);
  }

  deleteDocument(id: string): Promise<void> {
    return this.ragStore.deleteDocument(id);
  }

  findDocument(id: string): Promise<RagDocument | undefined> {
    return this.ragStore.findDocument(id);
  }

  findDocumentOrFail(id: string): Promise<RagDocument> {
    return this.ragStore.findDocumentOrFail(id);
  }

  listDocuments(): Promise<(RagDocument & { chunkCount: number })[]> {
    return this.ragStore.listDocuments();
  }

  findDocumentWithChunks(id: string): Promise<RagDocumentWithChunks> {
    return this.ragStore.findDocumentWithChunks(id);
  }

  createChunks(
    documentId: string,
    docTitle: string,
    chunks: { content: string; embedding: number[] }[],
    embeddingModel?: string,
  ): Promise<void> {
    return this.ragStore.createChunks(documentId, docTitle, chunks, embeddingModel);
  }
}
