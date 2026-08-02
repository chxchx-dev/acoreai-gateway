export interface CreateLogInput {
  userId?: string;
  conversationId?: string;
  source?: string;
  question: string;
  answer?: string | null;
  model: string;
  status: string;
  errorMessage?: string;
  durationMs?: number;
  chunksUsed?: number;
  sources?: unknown;
}

export interface ChatLogEntry {
  id: string;
  userId?: string;
  conversationId?: string;
  source?: string;
  question: string;
  answer?: string | null;
  model: string;
  status: string;
  errorMessage?: string;
  durationMs?: number;
  chunksUsed: number;
  sources?: unknown;
  createdAt: Date;
}

export interface ConversationSummary {
  conversationId: string;
  title: string;
  messageCount: number;
  lastMessageAt: Date;
}

export interface LogsQuery {
  limit?: number;
  status?: string;
  source?: string;
  userId?: string;
  conversationId?: string;
}

export interface LogsListResult {
  items: Partial<ChatLogEntry>[];
  total: number;
}

export interface ExportLogsFilters {
  status?: string;
  source?: string;
  userId?: string;
  from?: string;
  to?: string;
}
