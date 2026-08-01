-- CreateEnum
CREATE TYPE "LanguageCode" AS ENUM ('EN', 'FR', 'PT');

-- CreateEnum
CREATE TYPE "LanguageProfileStatus" AS ENUM ('ACTIVE', 'PAUSED', 'RESET');

-- CreateEnum
CREATE TYPE "AdventurePhaseStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'LOCKED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AdventureLessonType" AS ENUM ('LESSON', 'PRACTICE', 'SPEAKING', 'LISTENING', 'REVIEW', 'HIDDEN');

-- CreateEnum
CREATE TYPE "LessonProgressStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'IN_PROGRESS', 'COMPLETED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('PRE_TEST', 'MIDTERM', 'FINAL_EXAM');

-- CreateEnum
CREATE TYPE "ExamStatus" AS ENUM ('LOCKED', 'AVAILABLE', 'PASSED', 'FAILED', 'BLOCKED_REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "XpSourceType" AS ENUM ('LESSON', 'EXAM', 'HIDDEN_LEVEL', 'MANUAL_ADJUSTMENT');

-- CreateEnum
CREATE TYPE "TitleUnlockSource" AS ENUM ('LEVEL', 'ACHIEVEMENT', 'HIDDEN_LEVEL', 'STREAK', 'ADMIN');

-- CreateTable
CREATE TABLE "LanguageProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "languageCode" "LanguageCode" NOT NULL DEFAULT 'EN',
    "status" "LanguageProfileStatus" NOT NULL DEFAULT 'ACTIVE',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "currentXp" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "selectedTitleId" TEXT,
    "currentPhaseId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageTitle" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "source" "TitleUnlockSource" NOT NULL,
    "minLevel" INTEGER,
    "metadata" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserLanguageTitle" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "titleId" TEXT NOT NULL,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "selectedAt" TIMESTAMP(3),

    CONSTRAINT "UserLanguageTitle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageAdventurePhase" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "phaseNumber" INTEGER NOT NULL,
    "topic" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 1,
    "cefrLevel" TEXT,
    "status" "AdventurePhaseStatus" NOT NULL DEFAULT 'DRAFT',
    "aiPromptHash" TEXT,
    "generatedByModel" TEXT,
    "generatedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageAdventurePhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageAdventureLesson" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "type" "AdventureLessonType" NOT NULL DEFAULT 'LESSON',
    "title" TEXT NOT NULL,
    "objective" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "expectedXp" INTEGER NOT NULL DEFAULT 10,
    "unlockAfter" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageAdventureLesson_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageLessonProgress" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "status" "LessonProgressStatus" NOT NULL DEFAULT 'LOCKED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "errorsCount" INTEGER NOT NULL DEFAULT 0,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageLessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageAdventureExam" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "type" "ExamType" NOT NULL,
    "unlockAfter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "instructions" TEXT,
    "questions" JSONB NOT NULL,
    "passScore" INTEGER NOT NULL DEFAULT 80,
    "maxAttempts" INTEGER NOT NULL DEFAULT 2,
    "xpReward" INTEGER NOT NULL DEFAULT 20,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageAdventureExam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageExamAttempt" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "attemptNumber" INTEGER NOT NULL,
    "answers" JSONB NOT NULL,
    "score" INTEGER NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "feedback" JSONB,
    "xpAwarded" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageExamAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageXpTransaction" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "sourceType" "XpSourceType" NOT NULL,
    "sourceId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageXpTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageTopicMemory" (
    "id" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "topicSlug" TEXT NOT NULL,
    "difficultyLevel" INTEGER NOT NULL DEFAULT 1,
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "contentDepthScore" INTEGER NOT NULL DEFAULT 0,
    "exhausted" BOOLEAN NOT NULL DEFAULT false,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageTopicMemory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageHiddenLevel" (
    "id" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "languageProfileId" TEXT NOT NULL,
    "unlockBlockStart" INTEGER NOT NULL,
    "unlockBlockEnd" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 15,
    "rewardTitleId" TEXT,
    "unlockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LanguageHiddenLevel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AiGenerationLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "languageProfileId" TEXT,
    "purpose" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptHash" TEXT NOT NULL,
    "promptPreview" TEXT,
    "responsePreview" TEXT,
    "responseJson" JSONB,
    "status" TEXT NOT NULL,
    "durationMs" INTEGER,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AiGenerationLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LanguageProfile_userId_idx" ON "LanguageProfile"("userId");

-- CreateIndex
CREATE INDEX "LanguageProfile_languageCode_currentLevel_idx" ON "LanguageProfile"("languageCode", "currentLevel");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageProfile_userId_languageCode_key" ON "LanguageProfile"("userId", "languageCode");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageTitle_code_key" ON "LanguageTitle"("code");

-- CreateIndex
CREATE INDEX "UserLanguageTitle_languageProfileId_idx" ON "UserLanguageTitle"("languageProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "UserLanguageTitle_languageProfileId_titleId_key" ON "UserLanguageTitle"("languageProfileId", "titleId");

-- CreateIndex
CREATE INDEX "LanguageAdventurePhase_languageProfileId_status_idx" ON "LanguageAdventurePhase"("languageProfileId", "status");

-- CreateIndex
CREATE INDEX "LanguageAdventurePhase_topicSlug_difficultyLevel_idx" ON "LanguageAdventurePhase"("topicSlug", "difficultyLevel");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageAdventurePhase_languageProfileId_phaseNumber_key" ON "LanguageAdventurePhase"("languageProfileId", "phaseNumber");

-- CreateIndex
CREATE INDEX "LanguageAdventureLesson_phaseId_type_idx" ON "LanguageAdventureLesson"("phaseId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageAdventureLesson_phaseId_lessonNumber_key" ON "LanguageAdventureLesson"("phaseId", "lessonNumber");

-- CreateIndex
CREATE INDEX "LanguageLessonProgress_languageProfileId_status_idx" ON "LanguageLessonProgress"("languageProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageLessonProgress_languageProfileId_lessonId_key" ON "LanguageLessonProgress"("languageProfileId", "lessonId");

-- CreateIndex
CREATE INDEX "LanguageAdventureExam_phaseId_unlockAfter_idx" ON "LanguageAdventureExam"("phaseId", "unlockAfter");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageAdventureExam_phaseId_type_key" ON "LanguageAdventureExam"("phaseId", "type");

-- CreateIndex
CREATE INDEX "LanguageExamAttempt_languageProfileId_passed_idx" ON "LanguageExamAttempt"("languageProfileId", "passed");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageExamAttempt_languageProfileId_examId_attemptNumber_key" ON "LanguageExamAttempt"("languageProfileId", "examId", "attemptNumber");

-- CreateIndex
CREATE INDEX "LanguageXpTransaction_languageProfileId_createdAt_idx" ON "LanguageXpTransaction"("languageProfileId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageXpTransaction_languageProfileId_sourceType_sourceId_key" ON "LanguageXpTransaction"("languageProfileId", "sourceType", "sourceId");

-- CreateIndex
CREATE INDEX "LanguageTopicMemory_languageProfileId_exhausted_idx" ON "LanguageTopicMemory"("languageProfileId", "exhausted");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageTopicMemory_languageProfileId_topicSlug_difficultyL_key" ON "LanguageTopicMemory"("languageProfileId", "topicSlug", "difficultyLevel");

-- CreateIndex
CREATE INDEX "LanguageHiddenLevel_languageProfileId_completedAt_idx" ON "LanguageHiddenLevel"("languageProfileId", "completedAt");

-- CreateIndex
CREATE INDEX "AiGenerationLog_languageProfileId_purpose_idx" ON "AiGenerationLog"("languageProfileId", "purpose");

-- CreateIndex
CREATE INDEX "AiGenerationLog_createdAt_idx" ON "AiGenerationLog"("createdAt");

-- AddForeignKey
ALTER TABLE "UserLanguageTitle" ADD CONSTRAINT "UserLanguageTitle_languageProfileId_fkey" FOREIGN KEY ("languageProfileId") REFERENCES "LanguageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserLanguageTitle" ADD CONSTRAINT "UserLanguageTitle_titleId_fkey" FOREIGN KEY ("titleId") REFERENCES "LanguageTitle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageAdventurePhase" ADD CONSTRAINT "LanguageAdventurePhase_languageProfileId_fkey" FOREIGN KEY ("languageProfileId") REFERENCES "LanguageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageAdventureLesson" ADD CONSTRAINT "LanguageAdventureLesson_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "LanguageAdventurePhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageLessonProgress" ADD CONSTRAINT "LanguageLessonProgress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "LanguageAdventureLesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageAdventureExam" ADD CONSTRAINT "LanguageAdventureExam_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "LanguageAdventurePhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageExamAttempt" ADD CONSTRAINT "LanguageExamAttempt_examId_fkey" FOREIGN KEY ("examId") REFERENCES "LanguageAdventureExam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageXpTransaction" ADD CONSTRAINT "LanguageXpTransaction_languageProfileId_fkey" FOREIGN KEY ("languageProfileId") REFERENCES "LanguageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageTopicMemory" ADD CONSTRAINT "LanguageTopicMemory_languageProfileId_fkey" FOREIGN KEY ("languageProfileId") REFERENCES "LanguageProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageHiddenLevel" ADD CONSTRAINT "LanguageHiddenLevel_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "LanguageAdventurePhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;

