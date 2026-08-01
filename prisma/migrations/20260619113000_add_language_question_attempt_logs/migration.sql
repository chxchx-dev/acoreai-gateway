-- CreateTable
CREATE TABLE "LanguageQuestionAttemptLog" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "phaseId" TEXT,
    "lessonId" TEXT,
    "examId" TEXT,
    "sourceType" TEXT NOT NULL,
    "questionIndex" INTEGER,
    "questionFingerprint" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT,
    "userAnswer" TEXT,
    "expectedAnswer" TEXT,
    "isCorrect" BOOLEAN NOT NULL,
    "feedback" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageQuestionAttemptLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LanguageQuestionAttemptLog_languageProfileId_createdAt_idx" ON "LanguageQuestionAttemptLog"("languageProfileId", "createdAt");

-- CreateIndex
CREATE INDEX "LanguageQuestionAttemptLog_languageProfileId_questionFingerpr_idx" ON "LanguageQuestionAttemptLog"("languageProfileId", "questionFingerprint");

-- CreateIndex
CREATE INDEX "LanguageQuestionAttemptLog_lessonId_idx" ON "LanguageQuestionAttemptLog"("lessonId");

-- CreateIndex
CREATE INDEX "LanguageQuestionAttemptLog_examId_idx" ON "LanguageQuestionAttemptLog"("examId");

-- AddForeignKey
ALTER TABLE "LanguageQuestionAttemptLog" ADD CONSTRAINT "LanguageQuestionAttemptLog_languageProfileId_fkey" FOREIGN KEY ("languageProfileId") REFERENCES "LanguageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
