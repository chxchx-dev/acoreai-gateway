-- CreateTable
CREATE TABLE "TranslationSave" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "translations" JSONB NOT NULL,
    "langs" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TranslationSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TranslationSave_userId_createdAt_idx" ON "TranslationSave"("userId", "createdAt" DESC);
