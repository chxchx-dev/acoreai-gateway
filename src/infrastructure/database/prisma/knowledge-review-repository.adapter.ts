import { Injectable } from '@nestjs/common';
import { KnowledgeReviewService } from 'src/modules/knowledge/knowledge-review.service';
import { KnowledgeReviewRepositoryPort } from 'src/application/ports/knowledge-review-repository.port';

@Injectable()
export class KnowledgeReviewRepositoryAdapter implements KnowledgeReviewRepositoryPort {
  constructor(private readonly reviewService: KnowledgeReviewService) {}

  review(...args: Parameters<KnowledgeReviewService['review']>) {
    return this.reviewService.review(...args);
  }

  updateChunk(...args: Parameters<KnowledgeReviewService['updateChunk']>) {
    return this.reviewService.updateChunk(...args);
  }

  deleteChunk(...args: Parameters<KnowledgeReviewService['deleteChunk']>) {
    return this.reviewService.deleteChunk(...args);
  }

  approveChunk(...args: Parameters<KnowledgeReviewService['approveChunk']>) {
    return this.reviewService.approveChunk(...args);
  }

  rejectChunk(...args: Parameters<KnowledgeReviewService['rejectChunk']>) {
    return this.reviewService.rejectChunk(...args);
  }
}
