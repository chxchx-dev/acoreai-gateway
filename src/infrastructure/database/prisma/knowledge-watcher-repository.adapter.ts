import { Injectable } from '@nestjs/common';
import { KnowledgeWatcherService } from 'src/modules/knowledge/watchers/knowledge-watcher.service';
import { KnowledgeWatcherRepositoryPort } from 'src/application/ports/knowledge-watcher-repository.port';

@Injectable()
export class KnowledgeWatcherRepositoryAdapter implements KnowledgeWatcherRepositoryPort {
  constructor(private readonly watcherService: KnowledgeWatcherService) {}

  create(...args: Parameters<KnowledgeWatcherService['create']>) {
    return this.watcherService.create(...args);
  }

  list(...args: Parameters<KnowledgeWatcherService['list']>) {
    return this.watcherService.list(...args);
  }

  findOne(...args: Parameters<KnowledgeWatcherService['findOne']>) {
    return this.watcherService.findOne(...args);
  }

  setStatus(...args: Parameters<KnowledgeWatcherService['setStatus']>) {
    return this.watcherService.setStatus(...args);
  }

  remove(...args: Parameters<KnowledgeWatcherService['remove']>) {
    return this.watcherService.remove(...args);
  }

  checkWatcher(...args: Parameters<KnowledgeWatcherService['checkWatcher']>) {
    return this.watcherService.checkWatcher(...args);
  }
}
