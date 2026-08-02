import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { TranslationSaveInput, TranslationSaveRecord } from 'src/domain/translate/translation-save';

@Injectable()
export class TranslationSaveService {
  constructor(private readonly prisma: PrismaService) {}

  async save(input: TranslationSaveInput): Promise<TranslationSaveRecord> {
    const row = await this.prisma.translationSave.create({
      data: {
        userId: input.userId,
        title: input.title,
        text: input.text,
        translations: input.translations,
        langs: input.langs,
      },
    });
    return this.toRecord(row);
  }

  async list(userId: string, limit = 50): Promise<TranslationSaveRecord[]> {
    const rows = await this.prisma.translationSave.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
    });
    return rows.map(r => this.toRecord(r));
  }

  async delete(id: string, userId: string): Promise<void> {
    const row = await this.prisma.translationSave.findUnique({ where: { id } });
    if (!row || row.userId !== userId) {
      throw new NotFoundException('Traducción no encontrada');
    }
    await this.prisma.translationSave.delete({ where: { id } });
  }

  private toRecord(row: {
    id: string; userId: string; title: string; text: string;
    translations: unknown; langs: unknown; createdAt: Date;
  }): TranslationSaveRecord {
    return {
      id: row.id,
      userId: row.userId,
      title: row.title,
      text: row.text,
      translations: row.translations as Record<string, string>,
      langs: row.langs as string[],
      createdAt: row.createdAt.toISOString(),
    };
  }
}
