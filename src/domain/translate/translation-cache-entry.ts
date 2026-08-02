export interface TranslationCacheEntry {
  textHash: string;
  language: string;
  sourceText: string;
  translation: string;
  model: string;
  hits: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TranslationCacheListQuery {
  language: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface TranslationCacheListResult {
  items: TranslationCacheEntry[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TranslationCacheLanguageStats {
  language: string;
  entries: number;
  totalHits: number;
}
