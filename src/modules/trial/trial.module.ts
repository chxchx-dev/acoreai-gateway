import { Module } from '@nestjs/common';
import { ChatModule } from 'src/modules/chat/chat.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { TrialController } from 'src/interfaces/http/controllers/trial.controller';
import { TrialService } from './trial.service';
import { TrialLimitGuard } from 'src/interfaces/http/guards/trial-limit.guard';

@Module({
  imports: [ChatModule, MongoModule],
  controllers: [TrialController],
  providers: [TrialService, TrialLimitGuard],
})
export class TrialModule {}
