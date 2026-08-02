import { Injectable } from '@nestjs/common';
import { TranslationCacheService } from 'src/modules/translate/translation-cache.service';
import { TranslationCachePort } from 'src/application/ports/translation-cache.port';
import {
  TranslationCacheListQuery,
  TranslationCacheListResult,
  TranslationCacheLanguageStats,
} from 'src/domain/translate/translation-cache-entry';

@Injectable()
export class TranslationCacheAdapter implements TranslationCachePort {
  constructor(private readonly translationCache: TranslationCacheService) {}

  get(language: string, text: string): Promise<string | null> {
    return this.translationCache.get(language, text);
  }

  set(language: string, text: string, translation: string, model: string): Promise<void> {
    return this.translationCache.set(language, text, translation, model);
  }

  listLanguages(): Promise<string[]> {
    return this.translationCache.listLanguages();
  }

  list(query: TranslationCacheListQuery): Promise<TranslationCacheListResult> {
    return this.translationCache.list(query);
  }

  remove(language: string, textHash: string): Promise<void> {
    return this.translationCache.remove(language, textHash);
  }

  stats(): Promise<TranslationCacheLanguageStats[]> {
    return this.translationCache.stats();
  }
}
