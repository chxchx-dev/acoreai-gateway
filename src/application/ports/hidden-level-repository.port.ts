import type { HiddenLevelService } from 'src/modules/languages/application/services/hidden-level.service';

export const HIDDEN_LEVEL_REPOSITORY_PORT = Symbol('HIDDEN_LEVEL_REPOSITORY_PORT');

export type HiddenLevelRepositoryPort = Pick<
  HiddenLevelService,
  'getHiddenLevels' | 'completeHiddenLevel'
>;
