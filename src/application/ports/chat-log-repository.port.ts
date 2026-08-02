import {
  ChatLogEntry,
  ConversationSummary,
  CreateLogInput,
  ExportLogsFilters,
  LogsListResult,
  LogsQuery,
} from 'src/domain/logs/chat-log';

export const CHAT_LOG_REPOSITORY_PORT = Symbol('CHAT_LOG_REPOSITORY_PORT');

export interface ChatLogRepositoryPort {
  create(input: CreateLogInput): Promise<void>;
  findConversationsByUser(userId: string): Promise<ConversationSummary[]>;
  findAll(query: LogsQuery): Promise<LogsListResult>;
  exportLogs(filters: ExportLogsFilters): Promise<Partial<ChatLogEntry>[]>;
  findOne(id: string): Promise<ChatLogEntry>;
}
