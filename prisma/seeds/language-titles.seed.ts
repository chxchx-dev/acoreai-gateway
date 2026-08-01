import { PrismaClient, TitleUnlockSource } from '@prisma/client';

const prisma = new PrismaClient();

const LEVEL_TITLES = [
  { code: 'ROOKIE_SPEAKER', name: 'Rookie Speaker', minLevel: 1, source: TitleUnlockSource.LEVEL },
  { code: 'WORD_EXPLORER', name: 'Word Explorer', minLevel: 6, source: TitleUnlockSource.LEVEL },
  { code: 'GRAMMAR_SCOUT', name: 'Grammar Scout', minLevel: 11, source: TitleUnlockSource.LEVEL },
  { code: 'CONVERSATION_BUILDER', name: 'Conversation Builder', minLevel: 21, source: TitleUnlockSource.LEVEL },
  { code: 'PHRASE_HUNTER', name: 'Phrase Hunter', minLevel: 31, source: TitleUnlockSource.LEVEL },
  { code: 'LISTENING_RANGER', name: 'Listening Ranger', minLevel: 41, source: TitleUnlockSource.LEVEL },
  { code: 'SPEAKING_PILOT', name: 'Speaking Pilot', minLevel: 51, source: TitleUnlockSource.LEVEL },
  { code: 'FLUENCY_SEEKER', name: 'Fluency Seeker', minLevel: 61, source: TitleUnlockSource.LEVEL },
  { code: 'DIALOGUE_MASTER', name: 'Dialogue Master', minLevel: 71, source: TitleUnlockSource.LEVEL },
  { code: 'ACCENT_SHAPER', name: 'Accent Shaper', minLevel: 81, source: TitleUnlockSource.LEVEL },
  { code: 'ENGLISH_VOYAGER', name: 'English Voyager', minLevel: 91, source: TitleUnlockSource.LEVEL },
  { code: 'FLUENCY_ARCHITECT', name: 'Fluency Architect', minLevel: 101, source: TitleUnlockSource.LEVEL },
];

const ACHIEVEMENT_TITLES = [
  { code: 'PERFECT_STREAK', name: 'Perfect Streak', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'PRE_TEST_BREAKER', name: 'Pre-Test Breaker', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'MIDTERM_HUNTER', name: 'Midterm Hunter', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'FINAL_BOSS_CLEAR', name: 'Final Boss Clear', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'CLEAN_PHASE_RUNNER', name: 'Clean Phase Runner', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'VOICE_SPARK', name: 'Voice Spark', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'SHARP_LISTENER', name: 'Sharp Listener', source: TitleUnlockSource.ACHIEVEMENT },
  { code: 'HIDDEN_PATH_SEEKER', name: 'Hidden Path Seeker', source: TitleUnlockSource.HIDDEN_LEVEL },
  { code: 'SECRET_WORLD_WALKER', name: 'Secret World Walker', source: TitleUnlockSource.HIDDEN_LEVEL },
  { code: 'FLUENCY_CORE', name: 'Fluency Core', source: TitleUnlockSource.ACHIEVEMENT },
];

async function main() {
  for (const t of [...LEVEL_TITLES, ...ACHIEVEMENT_TITLES]) {
    await prisma.languageTitle.upsert({
      where: { code: t.code },
      create: { ...t, description: t.name },
      update: { name: t.name },
    });
  }
  console.log('Language titles seeded.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
