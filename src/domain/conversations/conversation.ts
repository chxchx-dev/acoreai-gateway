export type ConversationRole = 'user' | 'assistant';
export type ConversationMessageStatus = 'saved' | 'error' | 'no_context';

export interface CachedConversation {
  id: string;
  userId?: string;
  source?: string;
  title?: string;
  status: 'active' | 'archived';
  summary?: string;
  summaryUpdatedAt?: string;
  summarizedMessageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CachedConversationMessage {
  id: string;
  conversationId: string;
  role: ConversationRole;
  content: string;
  model?: string;
  status: ConversationMessageStatus;
  errorMessage?: string;
  sources?: unknown;
  chunksUsed: number;
  createdAt: string;
}

export interface ResolveConversationInput {
  conversationId?: string;
  userId?: string;
  source?: string;
}

export interface CreateConversationInput {
  userId?: string;
  source?: string;
  title?: string;
}

export interface AppendMessageInput {
  conversationId: string;
  role: ConversationRole;
  content: string;
  model?: string;
  status?: ConversationMessageStatus;
  errorMessage?: string;
  sources?: unknown;
  chunksUsed?: number;
}

export interface ListConversationsQuery {
  limit?: number;
  userId?: string;
  source?: string;
  sourcePrefix?: string;
  status?: 'active' | 'archived' | 'all';
}

export interface ConversationMessagesQuery {
  userId?: string;
  limit?: number;
}

export interface ConversationsListResult {
  items: CachedConversation[];
  total: number;
}

export interface ConversationMessagesResult {
  conversationId: string;
  items: CachedConversationMessage[];
  total: number;
}

export interface ConversationSummaryWork {
  conversationId: string;
  currentSummary?: string;
  messages: CachedConversationMessage[];
  summarizeUpToCount: number;
}
