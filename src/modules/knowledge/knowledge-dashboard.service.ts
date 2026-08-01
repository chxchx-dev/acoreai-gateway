import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

const EXPIRING_SOON_DAYS = 30;

@Injectable()
export class KnowledgeDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getDashboard() {
    const now = new Date();
    const expiringSoonUntil = new Date(now.getTime() + EXPIRING_SOON_DAYS * 24 * 60 * 60 * 1000);

    const [
      publishedCount,
      pendingReviewCount,
      expiredCount,
      publishedChunksCount,
      embeddingFailedCount,
      unansweredQuestionsCount,
      recentSources,
      recentReviews,
      recentPublications,
      expiringSoon,
      failedJobs,
      sourcesWithoutValidUntil,
      duplicateGroups,
    ] = await Promise.all([
      this.prisma.knowledgeSource.count({ where: { status: 'published' } }),
      this.prisma.knowledgeSource.count({ where: { status: 'pending_review' } }),
      this.prisma.knowledgeSource.count({
        where: { status: { notIn: ['archived', 'rejected'] }, validUntil: { lt: now } },
      }),
      this.prisma.knowledgeChunk.count({ where: { status: 'published' } }),
      this.prisma.knowledgeSource.count({ where: { status: 'embedding_failed' } }),
      this.prisma.knowledgeSearchLog.count({ where: { resultCount: 0 } }),
      this.prisma.knowledgeSource.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: { id: true, title: true, status: true, createdAt: true },
      }),
      this.prisma.knowledgeReview.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { source: { select: { title: true } } },
      }),
      this.prisma.knowledgeSource.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 5,
        select: { id: true, title: true, publishedAt: true },
      }),
      this.prisma.knowledgeSource.findMany({
        where: {
          status: 'published',
          validUntil: { gte: now, lte: expiringSoonUntil },
        },
        select: { id: true, title: true, validUntil: true },
        orderBy: { validUntil: 'asc' },
      }),
      this.prisma.knowledgeProcessingJob.findMany({
        where: { status: 'failed' },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: { source: { select: { title: true } } },
      }),
      this.prisma.knowledgeSource.findMany({
        where: { status: 'published', validUntil: null },
        select: { id: true, title: true },
      }),
      this.prisma.knowledgeSource.groupBy({
        by: ['checksum'],
        where: { checksum: { not: null }, status: { notIn: ['archived', 'rejected'] } },
        _count: { checksum: true },
        having: { checksum: { _count: { gt: 1 } } },
      }),
    ]);

    const duplicateSources = duplicateGroups.length
      ? await this.prisma.knowledgeSource.findMany({
          where: { checksum: { in: duplicateGroups.map((g) => g.checksum as string) } },
          select: { id: true, title: true, checksum: true, status: true },
        })
      : [];

    return {
      cards: {
        publishedCount,
        pendingReviewCount,
        expiredCount,
        publishedChunksCount,
        embeddingFailedCount,
        unansweredQuestionsCount,
      },
      recent: {
        sources: recentSources,
        reviews: recentReviews.map((r) => ({
          id: r.id,
          sourceId: r.sourceId,
          sourceTitle: r.source.title,
          decision: r.decision,
          createdAt: r.createdAt,
        })),
        publications: recentPublications,
      },
      alerts: {
        expiringSoon,
        failedJobs: failedJobs.map((j) => ({
          id: j.id,
          jobType: j.jobType,
          sourceId: j.sourceId,
          sourceTitle: j.source?.title ?? null,
          errorMessage: j.errorMessage,
          createdAt: j.createdAt,
        })),
        sourcesWithoutValidUntil,
        duplicateSources,
      },
    };
  }
}
