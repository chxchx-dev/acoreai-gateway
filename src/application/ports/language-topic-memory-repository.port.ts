import type { LanguageTopicMemoryService } from 'src/modules/languages/application/services/language-topic-memory.service';

export const LANGUAGE_TOPIC_MEMORY_REPOSITORY_PORT = Symbol(
  'LANGUAGE_TOPIC_MEMORY_REPOSITORY_PORT',
);

export type LanguageTopicMemoryRepositoryPort = Pick<
  LanguageTopicMemoryService,
  'selectNextTopic' | 'markTopicUsed' | 'getUsedTopics'
>;
