import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { OllamaModule } from 'src/modules/ollama/ollama.module';
import { LanguageProfileService } from './application/services/language-profile.service';
import { LanguageXpService } from './application/services/language-xp.service';
import { LanguageLessonService } from './application/services/language-lesson.service';
import { LanguageExamService } from './application/services/language-exam.service';
import { LanguageTopicMemoryService } from './application/services/language-topic-memory.service';
import { AdventureGenerationService } from './application/services/adventure-generation.service';
import { HiddenLevelService } from './application/services/hidden-level.service';
import { LanguageProfileController } from 'src/interfaces/http/controllers/language-profile.controller';
import { LanguageAdventureController } from 'src/interfaces/http/controllers/language-adventure.controller';

@Module({
  imports: [PrismaModule, AuthModule, OllamaModule],
  providers: [
    LanguageProfileService,
    LanguageXpService,
    LanguageLessonService,
    LanguageExamService,
    LanguageTopicMemoryService,
    AdventureGenerationService,
    HiddenLevelService,
  ],
  controllers: [LanguageProfileController, LanguageAdventureController],
  exports: [LanguageProfileService, LanguageXpService, AdventureGenerationService],
})
export class LanguagesModule {}
