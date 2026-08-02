import type { KnowledgeWatcherService } from 'src/modules/knowledge/watchers/knowledge-watcher.service';

export const KNOWLEDGE_WATCHER_REPOSITORY_PORT = Symbol('KNOWLEDGE_WATCHER_REPOSITORY_PORT');

export type KnowledgeWatcherRepositoryPort = Pick<
  KnowledgeWatcherService,
  'create' | 'list' | 'findOne' | 'setStatus' | 'remove' | 'checkWatcher'
>;
