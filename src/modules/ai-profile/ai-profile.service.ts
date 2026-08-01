import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { MongoService } from 'src/infrastructure/database/mongodb/mongodb.service';

export interface AiProfileResult {
  userId: string;
  preferredMode: string;
  mainGoal: string;
  englishLevel: string;
  interestTopics: string[];
  correctionStyle: string;
  practiceStyle: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertAiProfileInput {
  userId: string;
  preferredMode: string;
  mainGoal: string;
  englishLevel: string;
  interestTopics: string[];
  correctionStyle: string;
  practiceStyle: string;
}

@Injectable()
export class AiProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mongo: MongoService,
  ) {}

  async getProfile(userId: string): Promise<AiProfileResult | null> {
    const cached = await this.mongo.aiProfiles().findOne({ userId });
    if (cached) {
      const { cachedAt: _c, ...rest } = cached;
      return rest as AiProfileResult;
    }

    const row = await this.prisma.aiUserProfile.findUnique({ where: { userId } });
    if (!row) return null;

    const result = this.toResult(row);
    void this.cacheProfile(result);
    return result;
  }

  async upsertProfile(input: UpsertAiProfileInput): Promise<AiProfileResult> {
    const row = await this.prisma.aiUserProfile.upsert({
      where: { userId: input.userId },
      create: {
        userId: input.userId,
        preferredMode: input.preferredMode,
        mainGoal: input.mainGoal,
        englishLevel: input.englishLevel,
        interestTopics: input.interestTopics,
        correctionStyle: input.correctionStyle,
        practiceStyle: input.practiceStyle,
        onboardingCompleted: true,
      },
      update: {
        preferredMode: input.preferredMode,
        mainGoal: input.mainGoal,
        englishLevel: input.englishLevel,
        interestTopics: input.interestTopics,
        correctionStyle: input.correctionStyle,
        practiceStyle: input.practiceStyle,
        onboardingCompleted: true,
      },
    });

    const result = this.toResult(row);
    void this.cacheProfile(result);
    return result;
  }

  private async cacheProfile(profile: AiProfileResult): Promise<void> {
    await this.mongo.aiProfiles().updateOne(
      { userId: profile.userId },
      { $set: { ...profile, cachedAt: new Date() } },
      { upsert: true },
    );
  }

  private toResult(row: {
    userId: string;
    preferredMode: string;
    mainGoal: string;
    englishLevel: string;
    interestTopics: string[];
    correctionStyle: string;
    practiceStyle: string;
    onboardingCompleted: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AiProfileResult {
    return {
      userId: row.userId,
      preferredMode: row.preferredMode,
      mainGoal: row.mainGoal,
      englishLevel: row.englishLevel,
      interestTopics: row.interestTopics,
      correctionStyle: row.correctionStyle,
      practiceStyle: row.practiceStyle,
      onboardingCompleted: row.onboardingCompleted,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    };
  }
}
