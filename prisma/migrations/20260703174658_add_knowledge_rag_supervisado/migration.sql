-- Centro de Conocimiento (RAG supervisado) — tablas aditivas, no toca AiDocument*.
-- Sin tenant_id: acoreai y olan corren en gateways separados.

-- CreateEnum
CREATE TYPE "KnowledgeSourceStatus" AS ENUM ('draft', 'pending_extraction', 'extracted', 'chunked', 'pending_review', 'needs_changes', 'approved', 'embedding_pending', 'embedding_failed', 'ready_to_publish', 'published', 'rejected', 'archived', 'expired');

-- CreateEnum
CREATE TYPE "KnowledgeChunkStatus" AS ENUM ('draft', 'pending_review', 'approved', 'rejected', 'published', 'archived', 'expired');

-- CreateEnum
CREATE TYPE "KnowledgeJobType" AS ENUM ('extract_text', 'chunk_text', 'generate_embeddings', 'detect_duplicates', 'compare_versions', 'validate_expiration');

-- CreateEnum
CREATE TYPE "KnowledgeJobStatus" AS ENUM ('queued', 'running', 'completed', 'failed', 'cancelled');

-- CreateEnum
CREATE TYPE "KnowledgeReviewDecision" AS ENUM ('approved', 'rejected', 'needs_changes');

-- CreateTable
CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sourceType" TEXT NOT NULL,
    "area" TEXT,
    "language" TEXT NOT NULL DEFAULT 'es',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'draft',
    "fileUrl" TEXT,
    "originalFilename" TEXT,
    "mimeType" TEXT,
    "checksum" TEXT,
    "currentVersion" INTEGER NOT NULL DEFAULT 1,
    "validFrom" DATE,
    "validUntil" DATE,
    "uploadedBy" TEXT,
    "reviewedBy" TEXT,
    "publishedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSourceVersion" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "extractedText" TEXT,
    "textHash" TEXT,
    "changeSummary" TEXT,
    "status" "KnowledgeSourceStatus" NOT NULL DEFAULT 'draft',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeSourceVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "versionId" TEXT,
    "chunkIndex" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "normalizedContent" TEXT,
    "contentHash" TEXT,
    "embedding" vector(768),
    "embeddingModel" TEXT,
    "status" "KnowledgeChunkStatus" NOT NULL DEFAULT 'draft',
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "sectionTitle" TEXT,
    "tokensCount" INTEGER,
    "priority" INTEGER NOT NULL DEFAULT 50,
    "validFrom" DATE,
    "validUntil" DATE,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeReview" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "versionId" TEXT,
    "reviewerId" TEXT NOT NULL,
    "decision" "KnowledgeReviewDecision" NOT NULL,
    "comments" TEXT,
    "checklist" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeProcessingJob" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT,
    "versionId" TEXT,
    "jobType" "KnowledgeJobType" NOT NULL,
    "status" "KnowledgeJobStatus" NOT NULL DEFAULT 'queued',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeProcessingJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "userId" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeSearchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "topK" INTEGER,
    "resultCount" INTEGER,
    "latencyMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeSearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KnowledgeAnswerSource" (
    "id" TEXT NOT NULL,
    "chatMessageId" TEXT,
    "sourceId" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "title" TEXT,
    "pageStart" INTEGER,
    "pageEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KnowledgeAnswerSource_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeSource_status_idx" ON "KnowledgeSource"("status");

-- CreateIndex
CREATE INDEX "KnowledgeSource_validFrom_validUntil_idx" ON "KnowledgeSource"("validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeSourceVersion_sourceId_version_key" ON "KnowledgeSourceVersion"("sourceId", "version");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_status_idx" ON "KnowledgeChunk"("status");

-- CreateIndex
CREATE INDEX "KnowledgeChunk_validFrom_validUntil_idx" ON "KnowledgeChunk"("validFrom", "validUntil");

-- CreateIndex
CREATE UNIQUE INDEX "KnowledgeChunk_sourceId_versionId_chunkIndex_key" ON "KnowledgeChunk"("sourceId", "versionId", "chunkIndex");

-- CreateIndex
CREATE INDEX "KnowledgeReview_sourceId_idx" ON "KnowledgeReview"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeProcessingJob_status_idx" ON "KnowledgeProcessingJob"("status");

-- CreateIndex
CREATE INDEX "KnowledgeProcessingJob_jobType_idx" ON "KnowledgeProcessingJob"("jobType");

-- CreateIndex
CREATE INDEX "KnowledgeAuditLog_entityType_entityId_idx" ON "KnowledgeAuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "KnowledgeAuditLog_action_idx" ON "KnowledgeAuditLog"("action");

-- CreateIndex
CREATE INDEX "KnowledgeAnswerSource_sourceId_idx" ON "KnowledgeAnswerSource"("sourceId");

-- CreateIndex
CREATE INDEX "KnowledgeAnswerSource_chunkId_idx" ON "KnowledgeAnswerSource"("chunkId");

-- AddForeignKey
ALTER TABLE "KnowledgeSourceVersion" ADD CONSTRAINT "KnowledgeSourceVersion_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeChunk" ADD CONSTRAINT "KnowledgeChunk_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeReview" ADD CONSTRAINT "KnowledgeReview_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeReview" ADD CONSTRAINT "KnowledgeReview_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcessingJob" ADD CONSTRAINT "KnowledgeProcessingJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "KnowledgeProcessingJob" ADD CONSTRAINT "KnowledgeProcessingJob_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "KnowledgeSourceVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
