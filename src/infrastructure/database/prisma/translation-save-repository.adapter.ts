import { Injectable } from '@nestjs/common';
import { TranslationSaveService } from 'src/modules/translate/translation-save.service';
import { TranslationSaveRepositoryPort } from 'src/application/ports/translation-save-repository.port';
import { TranslationSaveInput, TranslationSaveRecord } from 'src/domain/translate/translation-save';

@Injectable()
export class TranslationSaveRepositoryAdapter implements TranslationSaveRepositoryPort {
  constructor(private readonly translationSave: TranslationSaveService) {}

  save(input: TranslationSaveInput): Promise<TranslationSaveRecord> {
    return this.translationSave.save(input);
  }

  list(userId: string, limit?: number): Promise<TranslationSaveRecord[]> {
    return this.translationSave.list(userId, limit);
  }

  delete(id: string, userId: string): Promise<void> {
    return this.translationSave.delete(id, userId);
  }
}
