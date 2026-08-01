import * as Joi from 'joi';

const defaultCorsOrigins =
  'http://localhost:3000,http://localhost:5173,http://127.0.0.1:5500,http://localhost:5500,null';

export const envValidationSchema = Joi.object({
  PORT: Joi.number().default(4005),
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test')
    .default('development'),
  LOG_LEVEL: Joi.string()
    .valid('fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent')
    .default('info'),
  AI_GATEWAY_KEY: Joi.string().min(32).required(),
  MODEL_SERVER_URL: Joi.string().uri().optional(),
  OLLAMA_BASE_URL: Joi.when('MODEL_SERVER_URL', {
    is: Joi.string().uri().exist(),
    then: Joi.string().uri().optional(),
    otherwise: Joi.string().uri().required(),
  }),
  OLLAMA_EMBEDDING_MODEL: Joi.string().required(),
  EMBEDDING_DIMENSIONS: Joi.number().integer().valid(768).default(768),
  // 0 = autodetección de Ollama: usar todos los hilos disponibles.
  OLLAMA_NUM_THREAD: Joi.number().integer().min(0).default(0),
  DATABASE_URL: Joi.string().required(),
  MAX_CONTEXT_CHUNKS: Joi.number().default(5),
  MAX_CHUNK_CHARS: Joi.number().default(1200),
  MAX_QUESTION_CHARS: Joi.number().default(1000),
  REQUEST_TIMEOUT_MS: Joi.number().default(60000),
  MONGODB_URI: Joi.string().uri().default('mongodb://localhost:27017/olan_ai_gateway'),
  MONGODB_DB: Joi.string().default('olan_ai_gateway'),
  MONGODB_MAX_POOL_SIZE: Joi.number().integer().min(1).max(200).default(20),
  CONVERSATION_TTL_SECONDS: Joi.number().integer().min(60).default(2592000),
  CONVERSATION_SUMMARY_MESSAGE_THRESHOLD: Joi.number().integer().min(2).default(30),
  CONVERSATION_SUMMARY_CHAR_THRESHOLD: Joi.number().integer().min(1000).default(20000),
  CONVERSATION_SUMMARY_RECENT_MESSAGES: Joi.number().integer().min(2).default(10),
  TTS_SERVICE_URL: Joi.string().uri().default('http://tts-service:8880'),
  STT_SERVICE_URL: Joi.string().uri().default('http://stt-service:9000'),
  JWT_SECRET: Joi.string().min(32).required(),
  JWT_ISSUER: Joi.string().min(3).required(),
  JWT_AUDIENCE: Joi.string().min(3).required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(60).default(900),
  JWT_REFRESH_TTL_SECONDS: Joi.number().integer().min(3600).default(2592000),
  ADMIN_EMAIL: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().email().required(),
    otherwise: Joi.string().email().optional(),
  }),
  ADMIN_PASSWORD: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(12).required(),
    otherwise: Joi.string().min(12).optional(),
  }),
  ADMIN_NAME: Joi.when('NODE_ENV', {
    is: 'production',
    then: Joi.string().min(2).required(),
    otherwise: Joi.string().min(2).optional(),
  }),
  CORS_ORIGINS: Joi.string().default(defaultCorsOrigins),
  OLAN_PLATFORM_API_URL: Joi.string().uri().default('https://olan.com.co/app/api.asmx'),
  SMTP_HOST: Joi.string().allow('').optional(),
  SMTP_PORT: Joi.number().integer().default(587),
  SMTP_USER: Joi.string().allow('').optional(),
  SMTP_PASS: Joi.string().allow('').optional(),
  SMTP_FROM: Joi.string().allow('').optional(),
  PASSWORD_RESET_TTL_MINUTES: Joi.number().integer().min(1).default(15),
});
