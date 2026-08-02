import type { KnowledgeReviewService } from 'src/modules/knowledge/knowledge-review.service';

export const KNOWLEDGE_REVIEW_REPOSITORY_PORT = Symbol('KNOWLEDGE_REVIEW_REPOSITORY_PORT');

export type KnowledgeReviewRepositoryPort = Pick<
  KnowledgeReviewService,
  'review' | 'updateChunk' | 'deleteChunk' | 'approveChunk' | 'rejectChunk'
>;
