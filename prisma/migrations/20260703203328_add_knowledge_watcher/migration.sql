-- CreateTable
CREATE TABLE "KnowledgeWatcher" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "sourceType" TEXT NOT NULL DEFAULT 'url',
    "targetUrl" TEXT NOT NULL,
    "scheduleCron" TEXT NOT NULL,
    "lastCheckedAt" TIMESTAMP(3),
    "lastChecksum" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KnowledgeWatcher_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "KnowledgeWatcher_status_idx" ON "KnowledgeWatcher"("status");

-- AddForeignKey
ALTER TABLE "KnowledgeWatcher" ADD CONSTRAINT "KnowledgeWatcher_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id") ON DELETE CASCADE ON UPDATE CASCADE;
