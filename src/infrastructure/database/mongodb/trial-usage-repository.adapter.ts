import { Injectable } from '@nestjs/common';
import { TrialService } from 'src/modules/trial/trial.service';
import { TrialUsageRepositoryPort } from 'src/application/ports/trial-usage-repository.port';

@Injectable()
export class TrialUsageRepositoryAdapter implements TrialUsageRepositoryPort {
  constructor(private readonly trialService: TrialService) {}

  checkAndIncrement(fingerprint: string): Promise<{ count: number; allowed: boolean }> {
    return this.trialService.checkAndIncrement(fingerprint);
  }

  getCount(fingerprint: string): Promise<number> {
    return this.trialService.getCount(fingerprint);
  }
}
