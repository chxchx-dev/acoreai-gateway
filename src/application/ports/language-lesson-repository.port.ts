import type { LanguageLessonService } from 'src/modules/languages/application/services/language-lesson.service';

export const LANGUAGE_LESSON_REPOSITORY_PORT = Symbol('LANGUAGE_LESSON_REPOSITORY_PORT');

export type LanguageLessonRepositoryPort = Pick<
  LanguageLessonService,
  'startLesson' | 'completeLesson'
>;
