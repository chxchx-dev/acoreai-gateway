import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { KnowledgeModule } from 'src/modules/knowledge/knowledge.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { RagController } from 'src/interfaces/http/controllers/rag.controller';
import { RagService } from './rag.service';
import { RagStoreService } from './rag-store.service';

@Module({
  imports: [KnowledgeModule, PrismaModule, AuthModule],
  controllers: [RagController],
  providers: [
    RagStoreService,
    RagService,
  ],
  exports: [RagService, RagStoreService],
})
export class RagModule {}
