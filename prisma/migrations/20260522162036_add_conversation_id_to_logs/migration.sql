-- AlterTable
ALTER TABLE "AiChatLog" ADD COLUMN     "conversationId" TEXT;

-- CreateIndex
CREATE INDEX "AiChatLog_userId_createdAt_idx" ON "AiChatLog"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "AiChatLog_conversationId_idx" ON "AiChatLog"("conversationId");
