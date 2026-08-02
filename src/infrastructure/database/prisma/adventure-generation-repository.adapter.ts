import { Injectable } from '@nestjs/common';
import { AdventureGenerationService } from 'src/modules/languages/application/services/adventure-generation.service';
import { AdventureGenerationRepositoryPort } from 'src/application/ports/adventure-generation-repository.port';

@Injectable()
export class AdventureGenerationRepositoryAdapter implements AdventureGenerationRepositoryPort {
  constructor(private readonly adventureService: AdventureGenerationService) {}

  generatePhase(...args: Parameters<AdventureGenerationService['generatePhase']>) {
    return this.adventureService.generatePhase(...args);
  }

  listPhases(...args: Parameters<AdventureGenerationService['listPhases']>) {
    return this.adventureService.listPhases(...args);
  }

  syncPhaseState(...args: Parameters<AdventureGenerationService['syncPhaseState']>) {
    return this.adventureService.syncPhaseState(...args);
  }

  ensureLessonContent(...args: Parameters<AdventureGenerationService['ensureLessonContent']>) {
    return this.adventureService.ensureLessonContent(...args);
  }

  ensureExamQuestions(...args: Parameters<AdventureGenerationService['ensureExamQuestions']>) {
    return this.adventureService.ensureExamQuestions(...args);
  }

  getPhase(...args: Parameters<AdventureGenerationService['getPhase']>) {
    return this.adventureService.getPhase(...args);
  }
}
