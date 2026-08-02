import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { XpSourceType } from '@prisma/client';
import { computeLevelUp } from 'src/domain/languages/xp-policy';
import { getTitleCodesForLevel } from 'src/domain/languages/title-policy';

export interface XpAwardResult {
  xpAwarded: number;
  totalXp: number;
  currentXp: number;
  currentLevel: number;
  leveledUp: boolean;
  levelsGained: number;
  unlockedTitleCodes: string[];
}

@Injectable()
export class LanguageXpService {
  constructor(private readonly prisma: PrismaService) {}

  async awardXp(
    languageProfileId: string,
    sourceType: XpSourceType,
    sourceId: string,
    amount: number,
    reason: string,
  ): Promise<XpAwardResult> {
    // Idempotent: skip if already awarded for this source
    const existing = await this.prisma.languageXpTransaction.findUnique({
      where: { languageProfileId_sourceType_sourceId: { languageProfileId, sourceType, sourceId } },
    });
    if (existing) {
      const profile = await this.prisma.languageProfile.findUniqueOrThrow({ where: { id: languageProfileId } });
      return {
        xpAwarded: 0,
        totalXp: profile.totalXp,
        currentXp: profile.currentXp,
        currentLevel: profile.currentLevel,
        leveledUp: false,
        levelsGained: 0,
        unlockedTitleCodes: [],
      };
    }

    const profile = await this.prisma.languageProfile.findUniqueOrThrow({ where: { id: languageProfileId } });
    const prevLevel = profile.currentLevel;
    const { newLevel, newCurrentXp, levelsGained } = computeLevelUp(profile.currentLevel, profile.currentXp, amount);

    const updatedProfile = await this.prisma.languageProfile.update({
      where: { id: languageProfileId },
      data: {
        currentXp: newCurrentXp,
        totalXp: profile.totalXp + amount,
        currentLevel: newLevel,
      },
    });

    await this.prisma.languageXpTransaction.create({
      data: { languageProfileId, sourceType, sourceId, amount, reason },
    });

    // Unlock level titles
    const newTitleCodes = getTitleCodesForLevel(newLevel).filter(
      code => !getTitleCodesForLevel(prevLevel).includes(code),
    );
    const unlockedTitleCodes: string[] = [];
    for (const code of newTitleCodes) {
      const title = await this.prisma.languageTitle.findUnique({ where: { code } });
      if (title) {
        await this.prisma.userLanguageTitle.upsert({
          where: { languageProfileId_titleId: { languageProfileId, titleId: title.id } },
          create: { languageProfileId, titleId: title.id },
          update: {},
        });
        unlockedTitleCodes.push(code);
      }
    }

    return {
      xpAwarded: amount,
      totalXp: updatedProfile.totalXp,
      currentXp: updatedProfile.currentXp,
      currentLevel: updatedProfile.currentLevel,
      leveledUp: levelsGained > 0,
      levelsGained,
      unlockedTitleCodes,
    };
  }
}
