import { Injectable } from '@nestjs/common';
import { LogsService } from 'src/modules/logs/logs.service';
import { ChatLogRepositoryPort } from 'src/application/ports/chat-log-repository.port';
import {
  ChatLogEntry,
  ConversationSummary,
  CreateLogInput,
  ExportLogsFilters,
  LogsListResult,
  LogsQuery,
} from 'src/domain/logs/chat-log';

@Injectable()
export class ChatLogRepositoryAdapter implements ChatLogRepositoryPort {
  constructor(private readonly logsService: LogsService) {}

  create(input: CreateLogInput): Promise<void> {
    return this.logsService.create(input);
  }

  findConversationsByUser(userId: string): Promise<ConversationSummary[]> {
    return this.logsService.findConversationsByUser(userId);
  }

  findAll(query: LogsQuery): Promise<LogsListResult> {
    return this.logsService.findAll(query);
  }

  exportLogs(filters: ExportLogsFilters): Promise<Partial<ChatLogEntry>[]> {
    return this.logsService.exportLogs(filters);
  }

  findOne(id: string): Promise<ChatLogEntry> {
    return this.logsService.findOne(id);
  }
}
