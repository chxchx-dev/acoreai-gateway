CREATE TABLE "AiUserProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "preferredMode" TEXT NOT NULL,
    "mainGoal" TEXT NOT NULL,
    "englishLevel" TEXT NOT NULL,
    "interestTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "correctionStyle" TEXT NOT NULL,
    "practiceStyle" TEXT NOT NULL,
    "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AiUserProfile_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiUserProfile_userId_key" ON "AiUserProfile"("userId");
CREATE INDEX "AiUserProfile_userId_idx" ON "AiUserProfile"("userId");
