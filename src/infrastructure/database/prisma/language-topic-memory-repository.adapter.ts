import { Injectable } from '@nestjs/common';
import { LanguageTopicMemoryService } from 'src/modules/languages/application/services/language-topic-memory.service';
import { LanguageTopicMemoryRepositoryPort } from 'src/application/ports/language-topic-memory-repository.port';

@Injectable()
export class LanguageTopicMemoryRepositoryAdapter implements LanguageTopicMemoryRepositoryPort {
  constructor(private readonly topicMemory: LanguageTopicMemoryService) {}

  selectNextTopic(...args: Parameters<LanguageTopicMemoryService['selectNextTopic']>) {
    return this.topicMemory.selectNextTopic(...args);
  }

  markTopicUsed(...args: Parameters<LanguageTopicMemoryService['markTopicUsed']>) {
    return this.topicMemory.markTopicUsed(...args);
  }

  getUsedTopics(...args: Parameters<LanguageTopicMemoryService['getUsedTopics']>) {
    return this.topicMemory.getUsedTopics(...args);
  }
}
