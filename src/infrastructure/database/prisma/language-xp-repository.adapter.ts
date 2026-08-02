import { Injectable } from '@nestjs/common';
import { XpSourceType } from '@prisma/client';
import { LanguageXpService } from 'src/modules/languages/application/services/language-xp.service';
import { LanguageXpRepositoryPort } from 'src/application/ports/language-xp-repository.port';
import { XpAwardResult } from 'src/domain/languages/xp-award-result';

@Injectable()
export class LanguageXpRepositoryAdapter implements LanguageXpRepositoryPort {
  constructor(private readonly xpService: LanguageXpService) {}

  awardXp(
    languageProfileId: string,
    sourceType: XpSourceType,
    sourceId: string,
    amount: number,
    reason: string,
  ): Promise<XpAwardResult> {
    return this.xpService.awardXp(languageProfileId, sourceType, sourceId, amount, reason);
  }
}
