export interface RagChunk {
  id: string;
  documentId: string;
  docTitle: string;
  docSource?: string;
  chunkIndex: number;
  content: string;
  score?: number;
}
