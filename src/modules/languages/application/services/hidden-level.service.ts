import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { XpSourceType } from '@prisma/client';
import { LanguageXpService } from './language-xp.service';
import { HIDDEN_LEVEL_XP_REWARD } from '../../domain/exam-policy';

@Injectable()
export class HiddenLevelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: LanguageXpService,
  ) {}

  async getHiddenLevels(languageProfileId: string) {
    return this.prisma.languageHiddenLevel.findMany({
      where: { languageProfileId },
      orderBy: { unlockedAt: 'desc' },
    });
  }

  async completeHiddenLevel(languageProfileId: string, hiddenLevelId: string) {
    const hl = await this.prisma.languageHiddenLevel.findUnique({ where: { id: hiddenLevelId } });
    if (!hl) throw new NotFoundException('Nivel oculto no encontrado');
    if (hl.languageProfileId !== languageProfileId) throw new ForbiddenException('No pertenece a tu perfil');
    if (hl.completedAt) return { alreadyCompleted: true, xpResult: null };

    await this.prisma.languageHiddenLevel.update({
      where: { id: hiddenLevelId },
      data: { completedAt: new Date() },
    });

    const xpResult = await this.xpService.awardXp(
      languageProfileId,
      XpSourceType.HIDDEN_LEVEL,
      hiddenLevelId,
      HIDDEN_LEVEL_XP_REWARD,
      'Nivel oculto completado',
    );

    // Unlock titles based on completed hidden level count
    const completed = await this.prisma.languageHiddenLevel.count({
      where: { languageProfileId, completedAt: { not: null } },
    });
    const titleCodes: string[] = [];
    if (completed === 1) titleCodes.push('HIDDEN_PATH_SEEKER');
    if (completed >= 5) titleCodes.push('SECRET_WORLD_WALKER');

    for (const code of titleCodes) {
      const title = await this.prisma.languageTitle.findUnique({ where: { code } });
      if (title) {
        await this.prisma.userLanguageTitle.upsert({
          where: { languageProfileId_titleId: { languageProfileId, titleId: title.id } },
          create: { languageProfileId, titleId: title.id },
          update: {},
        });
      }
    }

    return { alreadyCompleted: false, xpResult, unlockedTitleCodes: titleCodes };
  }
}
