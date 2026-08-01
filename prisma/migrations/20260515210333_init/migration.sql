-- CreateTable
CREATE TABLE "AiChatLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "source" TEXT,
    "question" TEXT NOT NULL,
    "answer" TEXT,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "errorMessage" TEXT,
    "durationMs" INTEGER,
    "chunksUsed" INTEGER NOT NULL DEFAULT 0,
    "sources" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiChatLog_pkey" PRIMARY KEY ("id")
);
