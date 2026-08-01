-- EnableExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- Preserve chunks in a relational shape and move vectors to a dedicated table.
ALTER TABLE "AiDocumentChunk" DROP COLUMN IF EXISTS "embedding";

-- CreateTable
CREATE TABLE "AiDocumentEmbedding" (
    "id" TEXT NOT NULL,
    "chunkId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "dimensions" INTEGER NOT NULL,
    "embedding" vector(768) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiDocumentEmbedding_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AiDocumentChunk_documentId_chunkIndex_key" ON "AiDocumentChunk"("documentId", "chunkIndex");

-- CreateIndex
CREATE UNIQUE INDEX "AiDocumentEmbedding_chunkId_key" ON "AiDocumentEmbedding"("chunkId");

-- CreateIndex
CREATE INDEX "AiDocumentEmbedding_model_idx" ON "AiDocumentEmbedding"("model");

-- CreateIndex
CREATE INDEX "AiDocumentEmbedding_dimensions_idx" ON "AiDocumentEmbedding"("dimensions");

-- CreateIndex
CREATE INDEX "AiDocumentEmbedding_embedding_hnsw_idx" ON "AiDocumentEmbedding" USING hnsw ("embedding" vector_cosine_ops);

-- AddForeignKey
ALTER TABLE "AiDocumentEmbedding" ADD CONSTRAINT "AiDocumentEmbedding_chunkId_fkey" FOREIGN KEY ("chunkId") REFERENCES "AiDocumentChunk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
