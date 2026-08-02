import { RagDocument, RagDocumentWithChunks } from 'src/domain/rag/rag-document';

export const DOCUMENT_REPOSITORY_PORT = Symbol('DOCUMENT_REPOSITORY_PORT');

export interface DocumentRepositoryPort {
  createDocument(data: { title: string; source?: string; type?: string }): Promise<RagDocument>;
  deleteDocument(id: string): Promise<void>;
  findDocument(id: string): Promise<RagDocument | undefined>;
  findDocumentOrFail(id: string): Promise<RagDocument>;
  listDocuments(): Promise<(RagDocument & { chunkCount: number })[]>;
  findDocumentWithChunks(id: string): Promise<RagDocumentWithChunks>;
  createChunks(
    documentId: string,
    docTitle: string,
    chunks: { content: string; embedding: number[] }[],
    embeddingModel?: string,
  ): Promise<void>;
}
