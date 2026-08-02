import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { LanguageProfileService } from './application/services/language-profile.service';
import { LanguageXpService } from './application/services/language-xp.service';
import { LanguageLessonService } from './application/services/language-lesson.service';
import { LanguageExamService } from './application/services/language-exam.service';
import { LanguageTopicMemoryService } from './application/services/language-topic-memory.service';
import { AdventureGenerationService } from './application/services/adventure-generation.service';
import { HiddenLevelService } from './application/services/hidden-level.service';
import { LanguageProfileController } from 'src/interfaces/http/controllers/language-profile.controller';
import { LanguageAdventureController } from 'src/interfaces/http/controllers/language-adventure.controller';

import { LanguageProfileRepositoryAdapter } from 'src/infrastructure/database/prisma/language-profile-repository.adapter';
import { LANGUAGE_PROFILE_REPOSITORY_PORT } from 'src/application/ports/language-profile-repository.port';
import { LanguageXpRepositoryAdapter } from 'src/infrastructure/database/prisma/language-xp-repository.adapter';
import { LANGUAGE_XP_REPOSITORY_PORT } from 'src/application/ports/language-xp-repository.port';
import { LanguageTopicMemoryRepositoryAdapter } from 'src/infrastructure/database/prisma/language-topic-memory-repository.adapter';
import { LANGUAGE_TOPIC_MEMORY_REPOSITORY_PORT } from 'src/application/ports/language-topic-memory-repository.port';
import { HiddenLevelRepositoryAdapter } from 'src/infrastructure/database/prisma/hidden-level-repository.adapter';
import { HIDDEN_LEVEL_REPOSITORY_PORT } from 'src/application/ports/hidden-level-repository.port';
import { LanguageLessonRepositoryAdapter } from 'src/infrastructure/database/prisma/language-lesson-repository.adapter';
import { LANGUAGE_LESSON_REPOSITORY_PORT } from 'src/application/ports/language-lesson-repository.port';
import { LanguageExamRepositoryAdapter } from 'src/infrastructure/database/prisma/language-exam-repository.adapter';
import { LANGUAGE_EXAM_REPOSITORY_PORT } from 'src/application/ports/language-exam-repository.port';
import { AdventureGenerationRepositoryAdapter } from 'src/infrastructure/database/prisma/adventure-generation-repository.adapter';
import { ADVENTURE_GENERATION_REPOSITORY_PORT } from 'src/application/ports/adventure-generation-repository.port';

@Module({
  imports: [PrismaModule, AuthModule, AiOrchestratorModule],
  providers: [
    LanguageProfileService,
    LanguageXpService,
    LanguageLessonService,
    LanguageExamService,
    LanguageTopicMemoryService,
    AdventureGenerationService,
    HiddenLevelService,
    LanguageProfileRepositoryAdapter,
    { provide: LANGUAGE_PROFILE_REPOSITORY_PORT, useExisting: LanguageProfileRepositoryAdapter },
    LanguageXpRepositoryAdapter,
    { provide: LANGUAGE_XP_REPOSITORY_PORT, useExisting: LanguageXpRepositoryAdapter },
    LanguageTopicMemoryRepositoryAdapter,
    { provide: LANGUAGE_TOPIC_MEMORY_REPOSITORY_PORT, useExisting: LanguageTopicMemoryRepositoryAdapter },
    HiddenLevelRepositoryAdapter,
    { provide: HIDDEN_LEVEL_REPOSITORY_PORT, useExisting: HiddenLevelRepositoryAdapter },
    LanguageLessonRepositoryAdapter,
    { provide: LANGUAGE_LESSON_REPOSITORY_PORT, useExisting: LanguageLessonRepositoryAdapter },
    LanguageExamRepositoryAdapter,
    { provide: LANGUAGE_EXAM_REPOSITORY_PORT, useExisting: LanguageExamRepositoryAdapter },
    AdventureGenerationRepositoryAdapter,
    { provide: ADVENTURE_GENERATION_REPOSITORY_PORT, useExisting: AdventureGenerationRepositoryAdapter },
  ],
  controllers: [LanguageProfileController, LanguageAdventureController],
  exports: [
    LANGUAGE_PROFILE_REPOSITORY_PORT,
    LANGUAGE_XP_REPOSITORY_PORT,
    ADVENTURE_GENERATION_REPOSITORY_PORT,
  ],
})
export class LanguagesModule {}
