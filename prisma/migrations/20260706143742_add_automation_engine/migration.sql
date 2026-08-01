-- CreateEnum
CREATE TYPE "AutomationProcessStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "AutomationChecklistMoment" AS ENUM ('antes', 'despues');

-- CreateEnum
CREATE TYPE "AutomationLogStatus" AS ENUM ('pending', 'success', 'error');

-- DropIndex
DROP INDEX IF EXISTS "AiDocumentEmbedding_embedding_hnsw_idx";

-- AlterTable
ALTER TABLE "AiUserProfile" ALTER COLUMN "interestTopics" DROP DEFAULT;

-- CreateTable
CREATE TABLE "AutomationProcess" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'olan',
    "role" TEXT,
    "objective" TEXT,
    "status" "AutomationProcessStatus" NOT NULL DEFAULT 'draft',
    "requiredInputs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "optionalInputs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "restrictions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationStep" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationField" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "requerido" BOOLEAN NOT NULL DEFAULT false,
    "maxCaracteres" INTEGER,
    "opciones" JSONB,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "categoria" TEXT NOT NULL,
    "reglas" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationPayloadTemplate" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationPayloadTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationChecklistItem" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "momento" "AutomationChecklistMoment" NOT NULL,
    "label" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutomationChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationExecutionLog" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "status" "AutomationLogStatus" NOT NULL DEFAULT 'pending',
    "inputPayload" JSONB NOT NULL,
    "outputSummary" JSONB,
    "errorMessage" TEXT,
    "executedBy" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AutomationExecutionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AutomationProcess_slug_key" ON "AutomationProcess"("slug");

-- CreateIndex
CREATE INDEX "AutomationProcess_status_idx" ON "AutomationProcess"("status");

-- CreateIndex
CREATE INDEX "AutomationProcess_platform_idx" ON "AutomationProcess"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationStep_processId_order_key" ON "AutomationStep"("processId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationField_processId_key_key" ON "AutomationField"("processId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationRule_processId_categoria_key" ON "AutomationRule"("processId", "categoria");

-- CreateIndex
CREATE UNIQUE INDEX "AutomationPayloadTemplate_processId_name_key" ON "AutomationPayloadTemplate"("processId", "name");

-- CreateIndex
CREATE INDEX "AutomationChecklistItem_processId_momento_idx" ON "AutomationChecklistItem"("processId", "momento");

-- CreateIndex
CREATE INDEX "AutomationExecutionLog_processId_idx" ON "AutomationExecutionLog"("processId");

-- CreateIndex
CREATE INDEX "AutomationExecutionLog_status_idx" ON "AutomationExecutionLog"("status");

-- AddForeignKey
ALTER TABLE "AutomationStep" ADD CONSTRAINT "AutomationStep_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationField" ADD CONSTRAINT "AutomationField_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationRule" ADD CONSTRAINT "AutomationRule_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationPayloadTemplate" ADD CONSTRAINT "AutomationPayloadTemplate_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationChecklistItem" ADD CONSTRAINT "AutomationChecklistItem_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomationExecutionLog" ADD CONSTRAINT "AutomationExecutionLog_processId_fkey" FOREIGN KEY ("processId") REFERENCES "AutomationProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX IF EXISTS "LanguageQuestionAttemptLog_languageProfileId_questionFingerpr_i" RENAME TO "LanguageQuestionAttemptLog_languageProfileId_questionFinger_idx";
