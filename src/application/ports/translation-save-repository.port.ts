import { TranslationSaveInput, TranslationSaveRecord } from 'src/domain/translate/translation-save';

export const TRANSLATION_SAVE_REPOSITORY_PORT = Symbol('TRANSLATION_SAVE_REPOSITORY_PORT');

export interface TranslationSaveRepositoryPort {
  save(input: TranslationSaveInput): Promise<TranslationSaveRecord>;
  list(userId: string, limit?: number): Promise<TranslationSaveRecord[]>;
  delete(id: string, userId: string): Promise<void>;
}
