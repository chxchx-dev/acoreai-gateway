import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { HealthController } from 'src/interfaces/http/controllers/health.controller';
import { HealthService } from './health.service';

@Module({
  imports: [PrismaModule, MongoModule, AiOrchestratorModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
