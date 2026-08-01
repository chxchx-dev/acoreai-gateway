import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { LanguageCode } from '@prisma/client';

@Injectable()
export class LanguageProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(userId: string, languageCode: LanguageCode = LanguageCode.EN) {
    const existing = await this.prisma.languageProfile.findUnique({
      where: { userId_languageCode: { userId, languageCode } },
      include: {
        titles: { include: { title: true } },
        topicMemory: true,
      },
    });
    if (existing) return existing;

    return this.prisma.languageProfile.create({
      data: { userId, languageCode },
      include: {
        titles: { include: { title: true } },
        topicMemory: true,
      },
    });
  }

  async getDashboard(userId: string, languageCode: LanguageCode = LanguageCode.EN) {
    const profile = await this.prisma.languageProfile.findUnique({
      where: { userId_languageCode: { userId, languageCode } },
      include: {
        titles: { include: { title: true } },
        phases: {
          orderBy: { phaseNumber: 'desc' },
          take: 12,
          include: {
            lessons: { select: { id: true, lessonNumber: true, type: true, title: true } },
            exams: { select: { id: true, type: true, unlockAfter: true } },
          },
        },
        xpTransactions: { orderBy: { createdAt: 'desc' }, take: 10 },
      },
    });
    if (!profile) return null;
    return profile;
  }

  async selectTitle(languageProfileId: string, titleId: string) {
    const userTitle = await this.prisma.userLanguageTitle.findUnique({
      where: { languageProfileId_titleId: { languageProfileId, titleId } },
    });
    if (!userTitle) throw new NotFoundException('Título no desbloqueado');

    await this.prisma.languageProfile.update({
      where: { id: languageProfileId },
      data: { selectedTitleId: titleId },
    });
    await this.prisma.userLanguageTitle.update({
      where: { id: userTitle.id },
      data: { selectedAt: new Date() },
    });
  }

  async getAvailableTitles() {
    return this.prisma.languageTitle.findMany({ where: { isActive: true }, orderBy: { minLevel: 'asc' } });
  }
}
