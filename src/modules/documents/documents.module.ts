import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { RagModule } from 'src/modules/rag/rag.module';
import { DocumentsController } from 'src/interfaces/http/controllers/documents.controller';
import { DocumentsService } from './documents.service';

@Module({
  imports: [AiOrchestratorModule, RagModule, AuthModule],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
