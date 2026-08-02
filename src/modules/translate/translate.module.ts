import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { TranslateController } from 'src/interfaces/http/controllers/translate.controller';
import { TranslateService } from './translate.service';
import { TranslationSaveService } from './translation-save.service';
import { TranslationCacheService } from './translation-cache.service';
import { TranslationSaveRepositoryAdapter } from 'src/infrastructure/database/prisma/translation-save-repository.adapter';
import { TRANSLATION_SAVE_REPOSITORY_PORT } from 'src/application/ports/translation-save-repository.port';
import { TranslationCacheAdapter } from 'src/infrastructure/database/mongodb/translation-cache.adapter';
import { TRANSLATION_CACHE_PORT } from 'src/application/ports/translation-cache.port';

@Module({
  imports: [AiOrchestratorModule, AuthModule, MongoModule],
  controllers: [TranslateController],
  providers: [
    TranslateService,
    TranslationSaveService,
    TranslationCacheService,
    TranslationSaveRepositoryAdapter,
    { provide: TRANSLATION_SAVE_REPOSITORY_PORT, useExisting: TranslationSaveRepositoryAdapter },
    TranslationCacheAdapter,
    { provide: TRANSLATION_CACHE_PORT, useExisting: TranslationCacheAdapter },
  ],
})
export class TranslateModule {}
