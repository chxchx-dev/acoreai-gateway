import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

const BASE_TOPICS_BY_LEVEL: Record<number, string[]> = {
  1: [
    'greetings-and-introductions', 'personal-information', 'numbers-and-age',
    'family-members', 'school-objects', 'classroom-language', 'colors-and-shapes',
    'daily-routines', 'food-and-drinks', 'likes-and-dislikes', 'days-months-dates',
    'basic-directions', 'simple-present-habits', 'there-is-there-are', 'describing-people',
  ],
  2: [
    'past-experiences', 'future-plans', 'travel-situations', 'shopping-conversations',
    'health-and-symptoms', 'asking-for-help', 'describing-places', 'comparing-things',
    'hobbies-and-preferences', 'school-projects', 'technology-habits',
    'environmental-topics', 'giving-opinions', 'telling-stories', 'job-interviews-basic',
  ],
  3: [
    'academic-discussion', 'critical-thinking', 'debate-and-argumentation',
    'professional-interviews', 'business-communication', 'presentations', 'negotiation',
    'problem-solving', 'cultural-differences', 'news-discussion', 'ethics-and-ai',
    'scientific-explanation', 'abstract-opinions', 'persuasive-speaking', 'advanced-storytelling',
  ],
};

function slugToLabel(slug: string): string {
  return slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

@Injectable()
export class LanguageTopicMemoryService {
  constructor(private readonly prisma: PrismaService) {}

  async selectNextTopic(languageProfileId: string): Promise<{ topic: string; topicSlug: string; difficultyLevel: number }> {
    const usedTopics = await this.prisma.languageTopicMemory.findMany({
      where: { languageProfileId },
      orderBy: [{ difficultyLevel: 'asc' }, { usageCount: 'asc' }],
    });

    const usedSlugs = new Set(usedTopics.filter(t => !t.exhausted).map(t => `${t.topicSlug}:${t.difficultyLevel}`));

    for (let diff = 1; diff <= 3; diff++) {
      const available = (BASE_TOPICS_BY_LEVEL[diff] ?? []).filter(
        slug => !usedSlugs.has(`${slug}:${diff}`)
      );
      if (available.length > 0) {
        const topicSlug = available[0];
        return { topicSlug, topic: slugToLabel(topicSlug), difficultyLevel: diff };
      }
    }

    // All topics used — cycle with increased difficulty
    const leastUsed = usedTopics.sort((a, b) => a.usageCount - b.usageCount)[0];
    return {
      topicSlug: leastUsed.topicSlug,
      topic: slugToLabel(leastUsed.topicSlug),
      difficultyLevel: leastUsed.difficultyLevel + 1,
    };
  }

  async markTopicUsed(languageProfileId: string, topicSlug: string, difficultyLevel: number) {
    await this.prisma.languageTopicMemory.upsert({
      where: { languageProfileId_topicSlug_difficultyLevel: { languageProfileId, topicSlug, difficultyLevel } },
      create: {
        languageProfileId,
        topicSlug,
        topic: slugToLabel(topicSlug),
        difficultyLevel,
        usageCount: 1,
        lastUsedAt: new Date(),
      },
      update: {
        usageCount: { increment: 1 },
        lastUsedAt: new Date(),
      },
    });
  }

  async getUsedTopics(languageProfileId: string) {
    return this.prisma.languageTopicMemory.findMany({
      where: { languageProfileId },
      orderBy: { lastUsedAt: 'desc' },
    });
  }
}
