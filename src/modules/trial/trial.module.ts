import { Module } from '@nestjs/common';
import { ChatModule } from 'src/modules/chat/chat.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { TrialController } from 'src/interfaces/http/controllers/trial.controller';
import { TrialService } from './trial.service';
import { TrialLimitGuard } from 'src/interfaces/http/guards/trial-limit.guard';
import { TrialUsageRepositoryAdapter } from 'src/infrastructure/database/mongodb/trial-usage-repository.adapter';
import { TRIAL_USAGE_REPOSITORY_PORT } from 'src/application/ports/trial-usage-repository.port';

@Module({
  imports: [ChatModule, MongoModule],
  controllers: [TrialController],
  providers: [
    TrialService,
    TrialLimitGuard,
    TrialUsageRepositoryAdapter,
    { provide: TRIAL_USAGE_REPOSITORY_PORT, useExisting: TrialUsageRepositoryAdapter },
  ],
})
export class TrialModule {}
