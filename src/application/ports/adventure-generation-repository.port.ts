import type { AdventureGenerationService } from 'src/modules/languages/application/services/adventure-generation.service';

export const ADVENTURE_GENERATION_REPOSITORY_PORT = Symbol(
  'ADVENTURE_GENERATION_REPOSITORY_PORT',
);

export type AdventureGenerationRepositoryPort = Pick<
  AdventureGenerationService,
  'generatePhase' | 'listPhases' | 'syncPhaseState' | 'ensureLessonContent' | 'ensureExamQuestions' | 'getPhase'
>;
