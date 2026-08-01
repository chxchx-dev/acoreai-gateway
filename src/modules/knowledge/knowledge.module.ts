import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { LogsModule } from 'src/modules/logs/logs.module';
import { KnowledgeSourcesController } from 'src/interfaces/http/controllers/knowledge-sources.controller';
import { KnowledgeSourceConversionController } from 'src/interfaces/http/controllers/knowledge-source-conversion.controller';
import { KnowledgeChunksController } from 'src/interfaces/http/controllers/knowledge-chunks.controller';
import { KnowledgeSearchController } from 'src/interfaces/http/controllers/knowledge-search.controller';
import { ChatRagController } from 'src/interfaces/http/controllers/chat-rag.controller';
import { KnowledgeAuditController } from 'src/interfaces/http/controllers/knowledge-audit.controller';
import { KnowledgeTestController } from 'src/interfaces/http/controllers/knowledge-test.controller';
import { KnowledgeUnansweredController } from 'src/interfaces/http/controllers/knowledge-unanswered.controller';
import { KnowledgeDashboardController } from 'src/interfaces/http/controllers/knowledge-dashboard.controller';
import { KnowledgeWatchersController } from 'src/interfaces/http/controllers/knowledge-watchers.controller';
import { KnowledgeAuditService } from './knowledge-audit.service';
import { KnowledgeSourcesService } from './knowledge-sources.service';
import { KnowledgeIngestionService } from './ingestion/knowledge-ingestion.service';
import { KnowledgeReviewService } from './knowledge-review.service';
import { KnowledgePublishingService } from './knowledge-publishing.service';
import { KnowledgeEmbeddingsService } from './embeddings/knowledge-embeddings.service';
import { KnowledgeSearchService } from './retrieval/knowledge-search.service';
import { KnowledgeChatService } from './retrieval/knowledge-chat.service';
import { KnowledgeTestService } from './retrieval/knowledge-test.service';
import { KnowledgeDashboardService } from './knowledge-dashboard.service';
import { KnowledgeWatcherService } from './watchers/knowledge-watcher.service';

@Module({
  imports: [AuthModule, AiOrchestratorModule, LogsModule],
  controllers: [
    KnowledgeSourcesController,
    KnowledgeSourceConversionController,
    KnowledgeChunksController,
    KnowledgeSearchController,
    ChatRagController,
    KnowledgeAuditController,
    KnowledgeTestController,
    KnowledgeUnansweredController,
    KnowledgeDashboardController,
    KnowledgeWatchersController,
  ],
  providers: [
    KnowledgeSourcesService,
    KnowledgeAuditService,
    KnowledgeIngestionService,
    KnowledgeReviewService,
    KnowledgePublishingService,
    KnowledgeEmbeddingsService,
    KnowledgeSearchService,
    KnowledgeChatService,
    KnowledgeTestService,
    KnowledgeDashboardService,
    KnowledgeWatcherService,
  ],
  exports: [
    KnowledgeSourcesService,
    KnowledgeAuditService,
    KnowledgeIngestionService,
    KnowledgeReviewService,
    KnowledgePublishingService,
    KnowledgeEmbeddingsService,
    KnowledgeSearchService,
    KnowledgeChatService,
    KnowledgeTestService,
    KnowledgeDashboardService,
    KnowledgeWatcherService,
  ],
})
export class KnowledgeModule {}
