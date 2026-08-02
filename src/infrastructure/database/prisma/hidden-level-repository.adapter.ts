import { Injectable } from '@nestjs/common';
import { HiddenLevelService } from 'src/modules/languages/application/services/hidden-level.service';
import { HiddenLevelRepositoryPort } from 'src/application/ports/hidden-level-repository.port';

@Injectable()
export class HiddenLevelRepositoryAdapter implements HiddenLevelRepositoryPort {
  constructor(private readonly hiddenLevelService: HiddenLevelService) {}

  getHiddenLevels(...args: Parameters<HiddenLevelService['getHiddenLevels']>) {
    return this.hiddenLevelService.getHiddenLevels(...args);
  }

  completeHiddenLevel(...args: Parameters<HiddenLevelService['completeHiddenLevel']>) {
    return this.hiddenLevelService.completeHiddenLevel(...args);
  }
}
