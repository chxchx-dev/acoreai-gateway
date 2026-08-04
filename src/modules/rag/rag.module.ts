import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PgvectorAdapter } from 'src/infrastructure/vector-store/pgvector.adapter';
import { VECTOR_STORE_PORT } from 'src/application/ports/vector-store.port';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { RagController } from 'src/interfaces/http/controllers/rag.controller';
import { RagService } from './rag.service';
import { RagStoreService } from './rag-store.service';

@Module({
  imports: [AiOrchestratorModule, PrismaModule, AuthModule],
  controllers: [RagController],
  providers: [
    RagStoreService,
    PgvectorAdapter,
    {
      provide: VECTOR_STORE_PORT,
      useExisting: PgvectorAdapter,
    },
    RagService,
  ],
  exports: [RagService, RagStoreService, VECTOR_STORE_PORT],
})
export class RagModule {}
