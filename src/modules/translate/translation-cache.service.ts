import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { Filter } from 'mongodb';
import { MongoService, MongoTranslationDocument } from 'src/infrastructure/database/mongodb/mongodb.service';
import { LANGUAGE_NAMES } from './translate.service';

export interface TranslationCacheListQuery {
  language: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TranslationCacheListResult {
  items: MongoTranslationDocument[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TranslationCacheLanguageStats {
  language: string;
  entries: number;
  totalHits: number;
}

@Injectable()
export class TranslationCacheService {
  private readonly logger = new Logger(TranslationCacheService.name);

  constructor(private readonly mongo: MongoService) {}

  async get(language: string, text: string): Promise<string | null> {
    const textHash = this.hash(text);
    const result = await this.mongo.translations(language).findOneAndUpdate(
      { textHash },
      { $inc: { hits: 1 }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (result) {
      this.logger.debug(`Cache hit (${language}): ${textHash}`);
    }
    return result?.translation ?? null;
  }

  async set(language: string, text: string, translation: string, model: string): Promise<void> {
    const textHash = this.hash(text);
    const now = new Date();
    await this.mongo.translations(language).updateOne(
      { textHash },
      {
        $set: { sourceText: text, translation, model, language, updatedAt: now },
        $setOnInsert: { textHash, hits: 0, createdAt: now },
      },
      { upsert: true },
    );
  }

  /** Idiomas conocidos: los mapeados de fábrica + cualquier otro que ya tenga colección creada. */
  async listLanguages(): Promise<string[]> {
    const known = new Set(Object.values(LANGUAGE_NAMES));
    const collections = await this.mongo.listTranslationCollections();
    for (const name of collections) {
      const slug = name.replace(/^translations_/, '');
      const match = Object.values(LANGUAGE_NAMES).find(
        (lang) => this.slugify(lang) === slug,
      );
      known.add(match ?? slug);
    }
    return Array.from(known).sort((a, b) => a.localeCompare(b));
  }

  async list(query: TranslationCacheListQuery): Promise<TranslationCacheListResult> {
    const page = Math.max(query.page ?? 1, 1);
    const pageSize = Math.min(Math.max(query.pageSize ?? 20, 1), 100);
    const where: Filter<MongoTranslationDocument> = {};
    if (query.search) {
      const regex = new RegExp(this.escapeRegex(query.search), 'i');
      where.$or = [{ sourceText: regex }, { translation: regex }];
    }

    const collection = this.mongo.translations(query.language);
    const [items, total] = await Promise.all([
      collection
        .find(where)
        .sort({ updatedAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray(),
      collection.countDocuments(where),
    ]);

    return { items, total, page, pageSize };
  }

  async remove(language: string, textHash: string): Promise<void> {
    await this.mongo.translations(language).deleteOne({ textHash });
  }

  async stats(): Promise<TranslationCacheLanguageStats[]> {
    const languages = await this.listLanguages();
    const results = await Promise.all(
      languages.map(async (language) => {
        const collection = this.mongo.translations(language);
        const [entries, agg] = await Promise.all([
          collection.countDocuments({}),
          collection
            .aggregate<{ _id: null; totalHits: number }>([
              { $group: { _id: null, totalHits: { $sum: '$hits' } } },
            ])
            .toArray(),
        ]);
        return { language, entries, totalHits: agg[0]?.totalHits ?? 0 };
      }),
    );
    return results.filter((r) => r.entries > 0).sort((a, b) => b.entries - a.entries);
  }

  private hash(text: string): string {
    return createHash('sha256').update(text.trim()).digest('hex');
  }

  private slugify(language: string): string {
    return language
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
