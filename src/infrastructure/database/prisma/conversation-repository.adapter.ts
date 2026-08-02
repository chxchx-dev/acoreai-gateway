import { Injectable } from '@nestjs/common';
import { ConversationsService } from 'src/modules/conversations/conversations.service';
import { ConversationRepositoryPort } from 'src/application/ports/conversation-repository.port';
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

/**
 * Compone Postgres (fuente de verdad) y MongoDB (caché/working-set con TTL)
 * para el mismo agregado de conversación. Esa fusión ya vive dentro de
 * ConversationsService; este adapter solo lo expone detrás del puerto.
 */
@Injectable()
export class ConversationRepositoryAdapter implements ConversationRepositoryPort {
  constructor(private readonly conversations: ConversationsService) {}

  resolveConversation(input: ResolveConversationInput): Promise<CachedConversation> {
    return this.conversations.resolveConversation(input);
  }

  createConversation(input: CreateConversationInput): Promise<CachedConversation> {
    return this.conversations.createConversation(input);
  }

  listConversations(query: ListConversationsQuery): Promise<ConversationsListResult> {
    return this.conversations.listConversations(query);
  }

  getConversationMessages(
    conversationId: string,
    query: ConversationMessagesQuery,
  ): Promise<ConversationMessagesResult> {
    return this.conversations.getConversationMessages(conversationId, query);
  }

  updateConversationTitle(
    conversationId: string,
    title: string,
    userId?: string,
  ): Promise<CachedConversation> {
    return this.conversations.updateConversationTitle(conversationId, title, userId);
  }

  archiveConversation(conversationId: string, userId?: string): Promise<CachedConversation> {
    return this.conversations.archiveConversation(conversationId, userId);
  }

  deleteConversation(
    conversationId: string,
    userId?: string,
  ): Promise<{ deleted: true; conversationId: string }> {
    return this.conversations.deleteConversation(conversationId, userId);
  }

  appendMessage(input: AppendMessageInput): Promise<CachedConversationMessage> {
    return this.conversations.appendMessage(input);
  }

  getRecentMessages(conversationId: string, limit?: number): Promise<CachedConversationMessage[]> {
    return this.conversations.getRecentMessages(conversationId, limit);
  }

  touchConversation(conversationId: string): Promise<void> {
    return this.conversations.touchConversation(conversationId);
  }

  getSummaryWork(conversationId: string): Promise<ConversationSummaryWork | undefined> {
    return this.conversations.getSummaryWork(conversationId);
  }

  saveSummary(
    conversationId: string,
    summary: string,
    summarizedMessageCount: number,
  ): Promise<void> {
    return this.conversations.saveSummary(conversationId, summary, summarizedMessageCount);
  }

  buildHistoryBlock(messages: CachedConversationMessage[]): string {
    return this.conversations.buildHistoryBlock(messages);
  }

  resolveHistoryLimit(limit?: number): number {
    return this.conversations.resolveHistoryLimit(limit);
  }
}
