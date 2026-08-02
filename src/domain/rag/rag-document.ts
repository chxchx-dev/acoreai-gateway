import { RagChunk } from './rag-chunk';

export interface RagDocument {
  id: string;
  title: string;
  source?: string;
  type: string;
  createdAt: string;
}

export interface RagDocumentWithChunks extends RagDocument {
  chunks: Omit<RagChunk, 'docTitle' | 'score'>[];
}
