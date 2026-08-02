import { XpSourceType } from '@prisma/client';
import { XpAwardResult } from 'src/domain/languages/xp-award-result';

export const LANGUAGE_XP_REPOSITORY_PORT = Symbol('LANGUAGE_XP_REPOSITORY_PORT');

export interface LanguageXpRepositoryPort {
  awardXp(
    languageProfileId: string,
    sourceType: XpSourceType,
    sourceId: string,
    amount: number,
    reason: string,
  ): Promise<XpAwardResult>;
}
