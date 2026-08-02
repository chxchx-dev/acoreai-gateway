import {
  TranslationCacheListQuery,
  TranslationCacheListResult,
  TranslationCacheLanguageStats,
} from 'src/domain/translate/translation-cache-entry';

export const TRANSLATION_CACHE_PORT = Symbol('TRANSLATION_CACHE_PORT');

export interface TranslationCachePort {
  get(language: string, text: string): Promise<string | null>;
  set(language: string, text: string, translation: string, model: string): Promise<void>;
  listLanguages(): Promise<string[]>;
  list(query: TranslationCacheListQuery): Promise<TranslationCacheListResult>;
  remove(language: string, textHash: string): Promise<void>;
  stats(): Promise<TranslationCacheLanguageStats[]>;
}
