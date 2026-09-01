export interface ChatOptions {
  temperature?: number;
  num_ctx?: number;
  num_predict?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_batch?: number;
  num_keep?: number;
}

export interface ChatRequest {
  question: string;
  userId?: string;
  conversationId?: string;
  source?: string;
  area?: string;
  language?: string;
  useRag?: boolean;
  requireKnowledge?: boolean;
  useHistory?: boolean;
  historyLimit?: number;
  model?: string;
  system?: string;
  options?: ChatOptions;
  keepAlive?: string;
  mode?: 'chat' | 'voice' | 'practice';
  practiceLevel?: string;
  practiceLanguage?: string;
}

export interface ChatSource {
  documentId: string;
  chunkId: string;
  title: string;
  chunkIndex: number;
  score?: number;
  sourceUrl?: string;
  page?: number | null;
  section?: string | null;
}

export interface ChatResponse {
  answer: string | null;
  model: string;
  durationMs: number;
  status: 'answered' | 'error' | 'no_context';
  sources: ChatSource[];
  conversationId?: string;
  messageId?: string;
  historyUsed?: number;
  error?: string;
}
