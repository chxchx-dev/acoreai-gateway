import { Injectable, NotFoundException } from '@nestjs/common';
import { Filter } from 'mongodb';
import {
  MongoChatLogDocument,
  MongoService,
} from 'src/infrastructure/database/mongodb/mongodb.service';
import { LogsQueryDto } from 'src/interfaces/http/dto/logs/logs-query.dto';
import { randomUUID } from 'crypto';

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

export interface ConversationSummary {
  conversationId: string;
  title: string;
  messageCount: number;
  lastMessageAt: Date;
}

export interface LogsListResult {
  items: Partial<MongoChatLogDocument>[];
  total: number;
}

@Injectable()
export class LogsService {
  constructor(private readonly mongo: MongoService) {}

  async create(input: CreateLogInput): Promise<void> {
    await this.mongo.chatLogs().insertOne({
      id: randomUUID(),
      userId: input.userId,
      conversationId: input.conversationId,
      source: input.source,
      question: input.question,
      answer: input.answer,
      model: input.model,
      status: input.status,
      errorMessage: input.errorMessage,
      durationMs: input.durationMs,
      chunksUsed: input.chunksUsed ?? 0,
      sources: input.sources,
      createdAt: new Date(),
    });
  }

  async findConversationsByUser(userId: string): Promise<ConversationSummary[]> {
    const groups = await this.mongo
      .chatLogs()
      .aggregate<{
        _id: string;
        title?: string;
        messageCount: number;
        lastMessageAt: Date;
      }>([
        {
          $match: {
            userId,
            conversationId: { $exists: true, $ne: null },
          },
        },
        { $sort: { createdAt: 1 } },
        {
          $group: {
            _id: '$conversationId',
            title: { $first: '$question' },
            messageCount: { $sum: 1 },
            lastMessageAt: { $max: '$createdAt' },
          },
        },
        { $sort: { lastMessageAt: -1 } },
      ])
      .toArray();

    return groups.map((group) => ({
      conversationId: group._id,
      title: (group.title ?? '').slice(0, 80) || 'Sin título',
      messageCount: group.messageCount,
      lastMessageAt: group.lastMessageAt,
    }));
  }

  async findAll(query: LogsQueryDto): Promise<LogsListResult> {
    const { limit = 20, status, source, userId, conversationId } = query;

    const where: Filter<MongoChatLogDocument> = {};
    if (status) where.status = status;
    if (source) where.source = source;
    if (userId) where.userId = userId;
    if (conversationId) where.conversationId = conversationId;

    const safeLimit = Math.min(limit, 100);
    const [items, total] = await Promise.all([
      this.mongo
        .chatLogs()
        .find(where, {
          projection: {
            _id: 0,
            id: 1,
            userId: 1,
            source: 1,
            question: 1,
            answer: 1,
            model: 1,
            status: 1,
            durationMs: 1,
            chunksUsed: 1,
            createdAt: 1,
          },
        })
        .sort({ createdAt: conversationId ? 1 : -1 })
        .limit(safeLimit)
        .toArray(),
      this.mongo.chatLogs().countDocuments(where),
    ]);

    return { items, total };
  }

  async exportLogs(filters: {
    status?: string;
    source?: string;
    userId?: string;
    from?: string;
    to?: string;
  }): Promise<Partial<MongoChatLogDocument>[]> {
    const MAX_EXPORT_ROWS = 50000;

    const where: Filter<MongoChatLogDocument> = {};
    if (filters.status) where.status = filters.status;
    if (filters.source) where.source = filters.source;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.$gte = new Date(filters.from);
      if (filters.to) where.createdAt.$lte = new Date(filters.to);
    }

    return this.mongo
      .chatLogs()
      .find(where, { projection: { _id: 0 } })
      .sort({ createdAt: -1 })
      .limit(MAX_EXPORT_ROWS)
      .toArray();
  }

  async findOne(id: string): Promise<MongoChatLogDocument> {
    const log = await this.mongo.chatLogs().findOne(
      { id },
      {
        projection: {
          _id: 0,
        },
      },
    );

    if (!log) {
      throw new NotFoundException(`Log ${id} no encontrado`);
    }

    return log;
  }
}
