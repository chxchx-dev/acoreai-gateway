import { registerAs } from '@nestjs/config';

const defaultCorsOrigins =
  'http://localhost:5175,http://localhost:5180';

export const appConfig = registerAs('app', () => ({
  port: parseInt(process.env['PORT'] ?? '4005', 10),
  nodeEnv: process.env['NODE_ENV'] ?? 'development',
  gatewayKey: process.env['AI_GATEWAY_KEY'] ?? '',
  corsOrigins: (process.env['CORS_ORIGINS'] ?? defaultCorsOrigins)
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  requestTimeoutMs: parseInt(process.env['REQUEST_TIMEOUT_MS'] ?? '60000', 10),
}));

export const ollamaConfig = registerAs('ollama', () => ({
  // MODEL_SERVER_URL = servidor dedicado con Ollama (remoto en prod, Mac local en dev)
  baseUrl:
    process.env['MODEL_SERVER_URL'] ??
    process.env['OLLAMA_BASE_URL'] ??
    'http://localhost:11434',
  embeddingModel: process.env['OLLAMA_EMBEDDING_MODEL'] ?? 'embeddinggemma',
}));

export const ragConfig = registerAs('rag', () => ({
  maxContextChunks: parseInt(process.env['MAX_CONTEXT_CHUNKS'] ?? '5', 10),
  maxChunkChars: parseInt(process.env['MAX_CHUNK_CHARS'] ?? '1200', 10),
  maxQuestionChars: parseInt(process.env['MAX_QUESTION_CHARS'] ?? '1000', 10),
}));

export const mongodbConfig = registerAs('mongodb', () => ({
  uri: process.env['MONGODB_URI'] ?? 'mongodb://localhost:27017/acoreai_ai_gateway',
  db: process.env['MONGODB_DB'] ?? 'acoreai_ai_gateway',
  maxPoolSize: parseInt(process.env['MONGODB_MAX_POOL_SIZE'] ?? '20', 10),
  conversationTtlSeconds: parseInt(
    process.env['CONVERSATION_TTL_SECONDS'] ?? '2592000',
    10,
  ),
  conversationSummaryMessageThreshold: parseInt(
    process.env['CONVERSATION_SUMMARY_MESSAGE_THRESHOLD'] ?? '30',
    10,
  ),
  conversationSummaryCharThreshold: parseInt(
    process.env['CONVERSATION_SUMMARY_CHAR_THRESHOLD'] ?? '20000',
    10,
  ),
  conversationSummaryRecentMessages: parseInt(
    process.env['CONVERSATION_SUMMARY_RECENT_MESSAGES'] ?? '10',
    10,
  ),
}));
