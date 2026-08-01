import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';
import { MongoService } from 'src/infrastructure/database/mongodb/mongodb.service';
import { ConversationMessagesQueryDto } from 'src/interfaces/http/dto/conversations/conversation-messages-query.dto';
import { ConversationsQueryDto } from 'src/interfaces/http/dto/conversations/conversations-query.dto';
import { CreateConversationDto } from 'src/interfaces/http/dto/conversations/create-conversation.dto';

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

interface ResolveConversationInput {
  conversationId?: string;
  userId?: string;
  source?: string;
}

interface AppendMessageInput {
  conversationId: string;
  role: ConversationRole;
  content: string;
  model?: string;
  status?: ConversationMessageStatus;
  errorMessage?: string;
  sources?: unknown;
  chunksUsed?: number;
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

@Injectable()
export class ConversationsService {
  private readonly maxHistoryMessages = 30;
  private readonly maxMessageChars = 1200;
  private readonly maxHistoryChars = 6000;

  constructor(
    private readonly mongo: MongoService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {}

  async resolveConversation(
    input: ResolveConversationInput,
  ): Promise<CachedConversation> {
    const conversationId = input.conversationId?.trim();

    if (conversationId) {
      let existing = await this.getConversation(conversationId);

      if (!existing) {
        // Conversación no encontrada (eliminada o expirada) — crear nueva con nuevo ID
        // No reutilizar el ID anterior: si fue eliminada intencionalmente, no debe resurgir
        const now = new Date().toISOString();
        const newConversation: CachedConversation = {
          id: randomUUID(),
          userId: input.userId,
          source: input.source,
          status: 'active',
          summarizedMessageCount: 0,
          createdAt: now,
          updatedAt: now,
        };
        await this.saveConversation(newConversation);
        return newConversation;
      }

      if (input.userId && existing.userId && existing.userId !== input.userId) {
        throw new ForbiddenException('La conversacion no pertenece a este usuario');
      }

      if (input.userId && !existing.userId) {
        existing.userId = input.userId;
        await this.saveConversation(existing);
      }

      return existing;
    }

    const now = new Date().toISOString();
    const conversation: CachedConversation = {
      id: randomUUID(),
      userId: input.userId,
      source: input.source,
      status: 'active',
      summarizedMessageCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    await this.saveConversation(conversation);
    return conversation;
  }

  async createConversation(
    input: CreateConversationDto,
  ): Promise<CachedConversation> {
    const conversation = await this.resolveConversation({
      userId: input.userId,
      source: input.source,
    });

    if (input.title?.trim()) {
      conversation.title = input.title.trim();
      await this.saveConversation(conversation);
    }

    return conversation;
  }

  async listConversations(
    query: ConversationsQueryDto,
  ): Promise<ConversationsListResult> {
    const limit = Math.min(query.limit ?? 20, 100);
    const status = query.status ?? 'active';
    const where: Prisma.AiConversationWhereInput = {};
    if (query.userId) where.userId = query.userId;
    if (query.sourcePrefix) where.source = { startsWith: query.sourcePrefix };
    else if (query.source) where.source = query.source;
    if (status !== 'all') where.status = status;

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.aiConversation.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        take: limit,
      }),
      this.prisma.aiConversation.count({ where }),
    ]);
    const items = rows.map((row) => this.toCachedConversation(row));

    return { items, total };
  }

  async getConversationMessages(
    conversationId: string,
    query: ConversationMessagesQueryDto,
  ): Promise<ConversationMessagesResult> {
    await this.assertConversationAccess(conversationId, query.userId);

    const limit = Math.min(query.limit ?? 200, 200);
    const total = await this.prisma.aiConversationMessage.count({
      where: { conversationId },
    });
    const skip = Math.max(0, total - limit);
    const rows = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip,
      take: limit,
    });
    const items = rows.map((row) => this.toCachedMessage(row));

    return {
      conversationId,
      items,
      total,
    };
  }

  async updateConversationTitle(
    conversationId: string,
    title: string,
    userId?: string,
  ): Promise<CachedConversation> {
    const conversation = await this.assertConversationAccess(conversationId, userId);

    conversation.title = title.trim();
    conversation.updatedAt = new Date().toISOString();
    await this.saveConversation(conversation);

    return conversation;
  }

  async archiveConversation(
    conversationId: string,
    userId?: string,
  ): Promise<CachedConversation> {
    const conversation = await this.assertConversationAccess(conversationId, userId);

    conversation.status = 'archived';
    conversation.updatedAt = new Date().toISOString();
    await this.saveConversation(conversation);

    return conversation;
  }

  async deleteConversation(
    conversationId: string,
    userId?: string,
  ): Promise<{ deleted: true; conversationId: string }> {
    await this.assertConversationAccess(conversationId, userId);

    await this.observability.measureStage('mongodb.conversation.delete', async () => {
      await Promise.all([
        this.mongo.conversations().deleteOne({ id: conversationId }),
        this.mongo.conversationMessages().deleteMany({ conversationId }),
      ]);
    });

    await this.prisma.aiConversation.delete({ where: { id: conversationId } });

    return { deleted: true, conversationId };
  }

  async appendMessage(input: AppendMessageInput): Promise<CachedConversationMessage> {
    const conversation = await this.getConversation(input.conversationId);
    if (!conversation) {
      throw new NotFoundException(
        `Conversacion ${input.conversationId} no encontrada`,
      );
    }

    const now = new Date().toISOString();
    const message: CachedConversationMessage = {
      id: randomUUID(),
      conversationId: input.conversationId,
      role: input.role,
      content: input.content,
      model: input.model,
      status: input.status ?? 'saved',
      errorMessage: input.errorMessage,
      sources: input.sources,
      chunksUsed: input.chunksUsed ?? 0,
      createdAt: now,
    };

    await this.observability.measureStage('mongodb.message.append', () =>
      this.mongo.conversationMessages().insertOne({
        ...message,
        expiresAt: this.expirationDate(),
      }),
    );

    conversation.updatedAt = now;
    if (!conversation.title && input.role === 'user') {
      conversation.title = this.truncate(input.content, 80);
    }

    await this.saveConversation(conversation);
    await this.prisma.aiConversationMessage.create({
      data: {
        id: message.id,
        conversationId: message.conversationId,
        role: message.role,
        content: message.content,
        model: message.model,
        status: message.status,
        errorMessage: message.errorMessage,
        chunksUsed: message.chunksUsed,
        sources: this.toJsonValue(message.sources),
        createdAt: new Date(message.createdAt),
      },
    });
    await this.refreshTtl(input.conversationId);

    return message;
  }

  async getRecentMessages(
    conversationId: string,
    limit = 10,
  ): Promise<CachedConversationMessage[]> {
    const safeLimit = this.resolveHistoryLimit(limit);
    const cachedItems = await this.observability.measureStage(
      'mongodb.messages.recent',
      () =>
        this.mongo
          .conversationMessages()
          .find({ conversationId })
          .sort({ createdAt: -1 })
          .limit(safeLimit)
          .toArray(),
    );
    const cached = cachedItems
      .reverse()
      .map(({ expiresAt: _expiresAt, ...message }) => message);

    if (cached.length > 0) {
      return cached;
    }

    const rows = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: safeLimit,
    });
    const messages = rows.reverse().map((row) => this.toCachedMessage(row));
    await this.warmMessagesCache(conversationId, messages);
    return messages;
  }

  async touchConversation(conversationId: string): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversacion ${conversationId} no encontrada`);
    }

    conversation.updatedAt = new Date().toISOString();
    await this.saveConversation(conversation);
  }

  async getSummaryWork(
    conversationId: string,
  ): Promise<ConversationSummaryWork | undefined> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      return undefined;
    }

    const totalMessages = await this.prisma.aiConversationMessage.count({
      where: { conversationId },
    });
    const summarizedCount = Math.min(
      conversation.summarizedMessageCount,
      totalMessages,
    );
    const recentMessages = this.config.get<number>(
      'CONVERSATION_SUMMARY_RECENT_MESSAGES',
      10,
    );
    const summarizeUpToCount = Math.max(
      summarizedCount,
      totalMessages - recentMessages,
    );

    if (summarizeUpToCount <= summarizedCount) {
      return undefined;
    }

    const rawItems = await this.prisma.aiConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      skip: summarizedCount,
      take: Math.max(0, summarizeUpToCount - summarizedCount),
    });
    const messages = rawItems
      .map((item) => this.toCachedMessage(item))
      .filter((message) => message.status !== 'error');

    if (messages.length === 0) {
      return undefined;
    }

    const messageThreshold = this.config.get<number>(
      'CONVERSATION_SUMMARY_MESSAGE_THRESHOLD',
      30,
    );
    const charThreshold = this.config.get<number>(
      'CONVERSATION_SUMMARY_CHAR_THRESHOLD',
      20000,
    );
    const contentChars = messages.reduce(
      (total, message) => total + message.content.length,
      0,
    );
    const unsummarizedCount = totalMessages - summarizedCount;

    if (unsummarizedCount < messageThreshold && contentChars < charThreshold) {
      return undefined;
    }

    return {
      conversationId,
      currentSummary: conversation.summary,
      messages,
      summarizeUpToCount,
    };
  }

  async saveSummary(
    conversationId: string,
    summary: string,
    summarizedMessageCount: number,
  ): Promise<void> {
    const conversation = await this.getConversation(conversationId);
    if (!conversation) {
      throw new NotFoundException(`Conversacion ${conversationId} no encontrada`);
    }

    conversation.summary = this.truncate(summary.trim(), 1800);
    conversation.summaryUpdatedAt = new Date().toISOString();
    conversation.summarizedMessageCount = summarizedMessageCount;
    await this.saveConversation(conversation);
  }

  buildHistoryBlock(messages: CachedConversationMessage[]): string {
    const lines: string[] = [];
    let totalChars = 0;

    for (const message of messages) {
      if (message.status === 'error') {
        continue;
      }

      const label = message.role === 'user' ? 'Usuario' : 'Asistente';
      const content = this.truncate(message.content, this.maxMessageChars);
      const line = `${label}: ${content}`;

      if (totalChars + line.length > this.maxHistoryChars) {
        break;
      }

      lines.push(line);
      totalChars += line.length;
    }

    return lines.length > 0 ? lines.join('\n') : '';
  }

  resolveHistoryLimit(limit?: number): number {
    if (!Number.isFinite(limit)) {
      return 10;
    }

    return Math.min(Math.max(Math.trunc(limit ?? 10), 0), this.maxHistoryMessages);
  }

  private async getConversation(
    id: string,
  ): Promise<CachedConversation | undefined> {
    const data = await this.observability.measureStage('mongodb.conversation.get', () =>
      this.mongo.conversations().findOne({ id }),
    );

    if (!data) {
      const row = await this.prisma.aiConversation.findUnique({ where: { id } });
      if (!row) {
        return undefined;
      }

      const conversation = this.toCachedConversation(row);
      await this.saveConversation(conversation);
      return conversation;
    }

    const { expiresAt: _expiresAt, ...conversation } = data;
    return conversation;
  }

  private async saveConversation(conversation: CachedConversation): Promise<void> {
    await this.observability.measureStage('mongodb.conversation.save', async () => {
      await this.mongo.conversations().updateOne(
        { id: conversation.id },
        {
          $set: {
            ...conversation,
            expiresAt: this.expirationDate(),
          },
        },
        { upsert: true },
      );
    });

    await this.prisma.aiConversation.upsert({
      where: { id: conversation.id },
      create: {
        id: conversation.id,
        userId: conversation.userId,
        source: conversation.source,
        title: conversation.title,
        status: conversation.status,
        summary: conversation.summary,
        summaryUpdatedAt: conversation.summaryUpdatedAt
          ? new Date(conversation.summaryUpdatedAt)
          : undefined,
        summarizedMessageCount: conversation.summarizedMessageCount,
        createdAt: new Date(conversation.createdAt),
        updatedAt: new Date(conversation.updatedAt),
      },
      update: {
        userId: conversation.userId,
        source: conversation.source,
        title: conversation.title,
        status: conversation.status,
        summary: conversation.summary,
        summaryUpdatedAt: conversation.summaryUpdatedAt
          ? new Date(conversation.summaryUpdatedAt)
          : null,
        summarizedMessageCount: conversation.summarizedMessageCount,
        updatedAt: new Date(conversation.updatedAt),
      },
    });
  }

  private async assertConversationAccess(
    conversationId: string,
    userId?: string,
  ): Promise<CachedConversation> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      throw new NotFoundException(`Conversacion ${conversationId} no encontrada`);
    }

    if (userId && conversation.userId && conversation.userId !== userId) {
      throw new ForbiddenException('La conversacion no pertenece a este usuario');
    }

    return conversation;
  }

  private async refreshTtl(conversationId: string): Promise<void> {
    const expiresAt = this.expirationDate();

    await this.observability.measureStage('mongodb.conversation.ttl', async () => {
      await Promise.all([
        this.mongo.conversations().updateOne(
          { id: conversationId },
          { $set: { expiresAt } },
        ),
        this.mongo.conversationMessages().updateMany(
          { conversationId },
          { $set: { expiresAt } },
        ),
      ]);
    });
  }

  private expirationDate(): Date {
    const ttl = this.config.get<number>('CONVERSATION_TTL_SECONDS', 2592000);
    return new Date(Date.now() + ttl * 1000);
  }

  private truncate(value: string, maxChars: number): string {
    if (value.length <= maxChars) {
      return value;
    }

    return `${value.slice(0, Math.max(0, maxChars - 3))}...`;
  }

  private toCachedConversation(row: {
    id: string;
    userId: string | null;
    source: string | null;
    title: string | null;
    status: string;
    summary: string | null;
    summaryUpdatedAt: Date | null;
    summarizedMessageCount: number;
    createdAt: Date;
    updatedAt: Date;
  }): CachedConversation {
    return {
      id: row.id,
      userId: row.userId ?? undefined,
      source: row.source ?? undefined,
      title: row.title ?? undefined,
      status: row.status === 'archived' ? 'archived' : 'active',
      summary: row.summary ?? undefined,
      summaryUpdatedAt: row.summaryUpdatedAt?.toISOString(),
      summarizedMessageCount: row.summarizedMessageCount,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }

  private toCachedMessage(row: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    model: string | null;
    status: string;
    errorMessage: string | null;
    sources: Prisma.JsonValue | null;
    chunksUsed: number;
    createdAt: Date;
  }): CachedConversationMessage {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role === 'assistant' ? 'assistant' : 'user',
      content: row.content,
      model: row.model ?? undefined,
      status: this.toMessageStatus(row.status),
      errorMessage: row.errorMessage ?? undefined,
      sources: row.sources ?? undefined,
      chunksUsed: row.chunksUsed,
      createdAt: row.createdAt.toISOString(),
    };
  }

  private toMessageStatus(status: string): ConversationMessageStatus {
    if (status === 'error' || status === 'no_context') {
      return status;
    }

    return 'saved';
  }

  private toJsonValue(value: unknown): Prisma.InputJsonValue | undefined {
    if (value === undefined) {
      return undefined;
    }

    return value as Prisma.InputJsonValue;
  }

  private async warmMessagesCache(
    conversationId: string,
    messages: CachedConversationMessage[],
  ): Promise<void> {
    if (messages.length === 0) {
      return;
    }

    const expiresAt = this.expirationDate();
    await this.observability.measureStage('mongodb.messages.warm_cache', () =>
      this.mongo.conversationMessages().bulkWrite(
        messages.map((message) => ({
          updateOne: {
            filter: { id: message.id },
            update: { $set: { ...message, expiresAt } },
            upsert: true,
          },
        })),
      ),
    );
    await this.refreshTtl(conversationId);
  }
}
