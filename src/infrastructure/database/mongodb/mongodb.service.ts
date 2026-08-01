import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Collection, Db, MongoClient, MongoClientOptions } from 'mongodb';

export interface MongoConversationDocument {
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
  expiresAt: Date;
}

export interface MongoConversationMessageDocument {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  model?: string;
  status: 'saved' | 'error' | 'no_context';
  errorMessage?: string;
  sources?: unknown;
  chunksUsed: number;
  createdAt: string;
  expiresAt: Date;
}

export interface MongoTrialUsageDocument {
  fingerprint: string;
  count: number;
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date;
}

export interface MongoAiProfileDocument {
  userId: string;
  preferredMode: string;
  mainGoal: string;
  englishLevel: string;
  interestTopics: string[];
  correctionStyle: string;
  practiceStyle: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
  cachedAt: Date;
}

export interface MongoTranslationDocument {
  textHash: string;
  language: string;
  sourceText: string;
  translation: string;
  model: string;
  hits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MongoChatLogDocument {
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

@Injectable()
export class MongoService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MongoService.name);
  private client?: MongoClient;
  private database?: Db;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const uri = this.config.get<string>('MONGODB_URI', 'mongodb://localhost:27017/olan_ai_gateway');
    const dbName = this.config.get<string>('MONGODB_DB', 'olan_ai_gateway');
    const options: MongoClientOptions = {
      maxPoolSize: this.config.get<number>('MONGODB_MAX_POOL_SIZE', 20),
      serverSelectionTimeoutMS: 5000,
    };

    this.client = new MongoClient(uri, options);
    await this.client.connect();
    this.database = this.client.db(dbName);
    await this.ensureIndexes();
    this.logger.log(`Conectado a MongoDB (${dbName})`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.close();
  }

  db(): Db {
    if (!this.database) {
      throw new Error('MongoDB no esta inicializado');
    }
    return this.database;
  }

  conversations(): Collection<MongoConversationDocument> {
    return this.db().collection<MongoConversationDocument>('conversations');
  }

  conversationMessages(): Collection<MongoConversationMessageDocument> {
    return this.db().collection<MongoConversationMessageDocument>('conversation_messages');
  }

  trialUsage(): Collection<MongoTrialUsageDocument> {
    return this.db().collection<MongoTrialUsageDocument>('trial_usage');
  }

  aiProfiles(): Collection<MongoAiProfileDocument> {
    return this.db().collection<MongoAiProfileDocument>('ai_profiles');
  }

  chatLogs(): Collection<MongoChatLogDocument> {
    return this.db().collection<MongoChatLogDocument>('chat_logs');
  }

  /**
   * Cada idioma tiene su propia colección (una "carpeta" de traducciones
   * por idioma) en vez de un único documento, para no chocar con el
   * límite de 16MB por documento de MongoDB a medida que crece el cache.
   */
  translations(language: string): Collection<MongoTranslationDocument> {
    const slug = this.translationCollectionSlug(language);
    const collection = this.db().collection<MongoTranslationDocument>(`translations_${slug}`);
    void this.ensureTranslationIndexes(collection);
    return collection;
  }

  private translationCollectionSlug(language: string): string {
    return (
      language
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || 'unknown'
    );
  }

  private readonly translationIndexesEnsured = new Set<string>();

  private async ensureTranslationIndexes(collection: Collection<MongoTranslationDocument>): Promise<void> {
    if (this.translationIndexesEnsured.has(collection.collectionName)) {
      return;
    }
    this.translationIndexesEnsured.add(collection.collectionName);
    await collection.createIndex({ textHash: 1 }, { unique: true });
  }

  /** Nombres de colecciones `translations_*` que ya existen (idiomas con al menos una entrada cacheada). */
  async listTranslationCollections(): Promise<string[]> {
    const collections = await this.db()
      .listCollections({ name: { $regex: '^translations_' } }, { nameOnly: true })
      .toArray();
    return collections.map((c) => c.name);
  }

  async ping(): Promise<void> {
    await this.db().command({ ping: 1 });
  }

  private async ensureIndexes(): Promise<void> {
    await Promise.all([
      this.conversations().createIndex({ id: 1 }, { unique: true }),
      this.conversations().createIndex({ updatedAt: -1 }),
      this.conversations().createIndex({ userId: 1, status: 1, updatedAt: -1 }),
      this.conversations().createIndex({ source: 1, status: 1, updatedAt: -1 }),
      this.conversations().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.conversationMessages().createIndex({ id: 1 }, { unique: true }),
      this.conversationMessages().createIndex({ conversationId: 1, createdAt: 1 }),
      this.conversationMessages().createIndex({ conversationId: 1, createdAt: -1 }),
      this.conversationMessages().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.trialUsage().createIndex({ fingerprint: 1 }, { unique: true }),
      this.trialUsage().createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
      this.aiProfiles().createIndex({ userId: 1 }, { unique: true }),
      this.chatLogs().createIndex({ id: 1 }, { unique: true }),
      this.chatLogs().createIndex({ userId: 1, createdAt: -1 }),
      this.chatLogs().createIndex({ conversationId: 1, createdAt: 1 }),
      this.chatLogs().createIndex({ status: 1, createdAt: -1 }),
      this.chatLogs().createIndex({ source: 1, createdAt: -1 }),
    ]);
  }
}
