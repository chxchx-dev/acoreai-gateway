import { Injectable } from '@nestjs/common';
import { MongoService } from 'src/infrastructure/database/mongodb/mongodb.service';

const TRIAL_LIMIT = 3;
const TRIAL_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 días

@Injectable()
export class TrialService {
  constructor(private readonly mongo: MongoService) {}

  async checkAndIncrement(fingerprint: string): Promise<{ count: number; allowed: boolean }> {
    const usage = await this.getActiveUsage(fingerprint);
    const count = usage?.count ?? 0;

    if (count >= TRIAL_LIMIT) {
      return { count, allowed: false };
    }

    const now = new Date();
    const expiresAt = usage?.expiresAt ?? this.expirationDate();
    const result = await this.mongo.trialUsage().findOneAndUpdate(
      { fingerprint },
      {
        $inc: { count: 1 },
        $set: { updatedAt: now, expiresAt },
        $setOnInsert: { fingerprint, createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );
    const newCount = result?.count ?? count + 1;

    return { count: newCount, allowed: true };
  }

  async getCount(fingerprint: string): Promise<number> {
    return (await this.getActiveUsage(fingerprint))?.count ?? 0;
  }

  private async getActiveUsage(fingerprint: string) {
    const usage = await this.mongo.trialUsage().findOne({ fingerprint });
    if (!usage) {
      return undefined;
    }
    if (usage.expiresAt.getTime() <= Date.now()) {
      await this.mongo.trialUsage().deleteOne({ fingerprint });
      return undefined;
    }
    return usage;
  }

  private expirationDate(): Date {
    return new Date(Date.now() + TRIAL_TTL_SECONDS * 1000);
  }
}
