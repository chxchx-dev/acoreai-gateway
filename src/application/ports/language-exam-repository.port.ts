import type { LanguageExamService } from 'src/modules/languages/application/services/language-exam.service';

export const LANGUAGE_EXAM_REPOSITORY_PORT = Symbol('LANGUAGE_EXAM_REPOSITORY_PORT');

export type LanguageExamRepositoryPort = Pick<
  LanguageExamService,
  'submitAttempt' | 'getExam'
>;
