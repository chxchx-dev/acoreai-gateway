import {
  AppendMessageInput,
  CachedConversation,
  CachedConversationMessage,
  ConversationMessagesQuery,
  ConversationMessagesResult,
  ConversationSummaryWork,
  ConversationsListResult,
  CreateConversationInput,
  ListConversationsQuery,
  ResolveConversationInput,
} from 'src/domain/conversations/conversation';

export const CONVERSATION_REPOSITORY_PORT = Symbol('CONVERSATION_REPOSITORY_PORT');

export interface ConversationRepositoryPort {
  resolveConversation(input: ResolveConversationInput): Promise<CachedConversation>;
  createConversation(input: CreateConversationInput): Promise<CachedConversation>;
  listConversations(query: ListConversationsQuery): Promise<ConversationsListResult>;
  getConversationMessages(
    conversationId: string,
    query: ConversationMessagesQuery,
  ): Promise<ConversationMessagesResult>;
  updateConversationTitle(
    conversationId: string,
    title: string,
    userId?: string,
  ): Promise<CachedConversation>;
  archiveConversation(conversationId: string, userId?: string): Promise<CachedConversation>;
  deleteConversation(
    conversationId: string,
    userId?: string,
  ): Promise<{ deleted: true; conversationId: string }>;
  appendMessage(input: AppendMessageInput): Promise<CachedConversationMessage>;
  getRecentMessages(conversationId: string, limit?: number): Promise<CachedConversationMessage[]>;
  touchConversation(conversationId: string): Promise<void>;
  getSummaryWork(conversationId: string): Promise<ConversationSummaryWork | undefined>;
  saveSummary(
    conversationId: string,
    summary: string,
    summarizedMessageCount: number,
  ): Promise<void>;
  buildHistoryBlock(messages: CachedConversationMessage[]): string;
  resolveHistoryLimit(limit?: number): number;
}
