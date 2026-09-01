import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { LogsModule } from 'src/modules/logs/logs.module';
import { KnowledgeSourcesController } from 'src/interfaces/http/controllers/knowledge-sources.controller';
import { KnowledgeSourceConversionController } from 'src/interfaces/http/controllers/knowledge-source-conversion.controller';
import { KnowledgeChunksController } from 'src/interfaces/http/controllers/knowledge-chunks.controller';
import { KnowledgeSearchController } from 'src/interfaces/http/controllers/knowledge-search.controller';
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
import { KnowledgeTestService } from './retrieval/knowledge-test.service';
import { KnowledgeDashboardService } from './knowledge-dashboard.service';
import { KnowledgeWatcherService } from './watchers/knowledge-watcher.service';

import { KnowledgeAuditRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-audit-repository.adapter';
import { KNOWLEDGE_AUDIT_REPOSITORY_PORT } from 'src/application/ports/knowledge-audit-repository.port';
import { KnowledgeDashboardRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-dashboard-repository.adapter';
import { KNOWLEDGE_DASHBOARD_REPOSITORY_PORT } from 'src/application/ports/knowledge-dashboard-repository.port';
import { KnowledgeIngestionRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-ingestion-repository.adapter';
import { KNOWLEDGE_INGESTION_REPOSITORY_PORT } from 'src/application/ports/knowledge-ingestion-repository.port';
import { KnowledgeEmbeddingsRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-embeddings-repository.adapter';
import { KNOWLEDGE_EMBEDDINGS_REPOSITORY_PORT } from 'src/application/ports/knowledge-embeddings-repository.port';
import { KnowledgePublishingRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-publishing-repository.adapter';
import { KNOWLEDGE_PUBLISHING_REPOSITORY_PORT } from 'src/application/ports/knowledge-publishing-repository.port';
import { KnowledgeReviewRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-review-repository.adapter';
import { KNOWLEDGE_REVIEW_REPOSITORY_PORT } from 'src/application/ports/knowledge-review-repository.port';
import { KnowledgeSourceRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-source-repository.adapter';
import { KNOWLEDGE_SOURCE_REPOSITORY_PORT } from 'src/application/ports/knowledge-source-repository.port';
import { KnowledgeSearchRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-search-repository.adapter';
import { KNOWLEDGE_SEARCH_REPOSITORY_PORT } from 'src/application/ports/knowledge-search-repository.port';
import { KnowledgeWatcherRepositoryAdapter } from 'src/infrastructure/database/prisma/knowledge-watcher-repository.adapter';
import { KNOWLEDGE_WATCHER_REPOSITORY_PORT } from 'src/application/ports/knowledge-watcher-repository.port';

@Module({
  imports: [AuthModule, AiOrchestratorModule, LogsModule],
  controllers: [
    KnowledgeSourcesController,
    KnowledgeSourceConversionController,
    KnowledgeChunksController,
    KnowledgeSearchController,
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
    KnowledgeTestService,
    KnowledgeDashboardService,
    KnowledgeWatcherService,
    KnowledgeAuditRepositoryAdapter,
    { provide: KNOWLEDGE_AUDIT_REPOSITORY_PORT, useExisting: KnowledgeAuditRepositoryAdapter },
    KnowledgeDashboardRepositoryAdapter,
    { provide: KNOWLEDGE_DASHBOARD_REPOSITORY_PORT, useExisting: KnowledgeDashboardRepositoryAdapter },
    KnowledgeIngestionRepositoryAdapter,
    { provide: KNOWLEDGE_INGESTION_REPOSITORY_PORT, useExisting: KnowledgeIngestionRepositoryAdapter },
    KnowledgeEmbeddingsRepositoryAdapter,
    { provide: KNOWLEDGE_EMBEDDINGS_REPOSITORY_PORT, useExisting: KnowledgeEmbeddingsRepositoryAdapter },
    KnowledgePublishingRepositoryAdapter,
    { provide: KNOWLEDGE_PUBLISHING_REPOSITORY_PORT, useExisting: KnowledgePublishingRepositoryAdapter },
    KnowledgeReviewRepositoryAdapter,
    { provide: KNOWLEDGE_REVIEW_REPOSITORY_PORT, useExisting: KnowledgeReviewRepositoryAdapter },
    KnowledgeSourceRepositoryAdapter,
    { provide: KNOWLEDGE_SOURCE_REPOSITORY_PORT, useExisting: KnowledgeSourceRepositoryAdapter },
    KnowledgeSearchRepositoryAdapter,
    { provide: KNOWLEDGE_SEARCH_REPOSITORY_PORT, useExisting: KnowledgeSearchRepositoryAdapter },
    KnowledgeWatcherRepositoryAdapter,
    { provide: KNOWLEDGE_WATCHER_REPOSITORY_PORT, useExisting: KnowledgeWatcherRepositoryAdapter },
  ],
  exports: [
    KnowledgeSourcesService,
    KnowledgeAuditService,
    KnowledgeIngestionService,
    KnowledgeReviewService,
    KnowledgePublishingService,
    KnowledgeEmbeddingsService,
    KnowledgeSearchService,
    KnowledgeTestService,
    KnowledgeDashboardService,
    KnowledgeWatcherService,
    KNOWLEDGE_AUDIT_REPOSITORY_PORT,
    KNOWLEDGE_DASHBOARD_REPOSITORY_PORT,
    KNOWLEDGE_INGESTION_REPOSITORY_PORT,
    KNOWLEDGE_EMBEDDINGS_REPOSITORY_PORT,
    KNOWLEDGE_PUBLISHING_REPOSITORY_PORT,
    KNOWLEDGE_REVIEW_REPOSITORY_PORT,
    KNOWLEDGE_SOURCE_REPOSITORY_PORT,
    KNOWLEDGE_SEARCH_REPOSITORY_PORT,
    KNOWLEDGE_WATCHER_REPOSITORY_PORT,
  ],
})
export class KnowledgeModule {}
