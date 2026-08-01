import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { TranslateController } from 'src/interfaces/http/controllers/translate.controller';
import { TranslateService } from './translate.service';
import { TranslationSaveService } from './translation-save.service';
import { TranslationCacheService } from './translation-cache.service';

@Module({
  imports: [AiOrchestratorModule, AuthModule, MongoModule],
  controllers: [TranslateController],
  providers: [TranslateService, TranslationSaveService, TranslationCacheService],
})
export class TranslateModule {}
