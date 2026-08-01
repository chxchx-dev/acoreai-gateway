export const LEVEL_TITLE_MAP: { minLevel: number; maxLevel: number; code: string; name: string }[] = [
  { minLevel: 1,   maxLevel: 5,   code: 'ROOKIE_SPEAKER',        name: 'Rookie Speaker' },
  { minLevel: 6,   maxLevel: 10,  code: 'WORD_EXPLORER',         name: 'Word Explorer' },
  { minLevel: 11,  maxLevel: 20,  code: 'GRAMMAR_SCOUT',         name: 'Grammar Scout' },
  { minLevel: 21,  maxLevel: 30,  code: 'CONVERSATION_BUILDER',  name: 'Conversation Builder' },
  { minLevel: 31,  maxLevel: 40,  code: 'PHRASE_HUNTER',         name: 'Phrase Hunter' },
  { minLevel: 41,  maxLevel: 50,  code: 'LISTENING_RANGER',      name: 'Listening Ranger' },
  { minLevel: 51,  maxLevel: 60,  code: 'SPEAKING_PILOT',        name: 'Speaking Pilot' },
  { minLevel: 61,  maxLevel: 70,  code: 'FLUENCY_SEEKER',        name: 'Fluency Seeker' },
  { minLevel: 71,  maxLevel: 80,  code: 'DIALOGUE_MASTER',       name: 'Dialogue Master' },
  { minLevel: 81,  maxLevel: 90,  code: 'ACCENT_SHAPER',         name: 'Accent Shaper' },
  { minLevel: 91,  maxLevel: 100, code: 'ENGLISH_VOYAGER',       name: 'English Voyager' },
  { minLevel: 101, maxLevel: 9999,code: 'FLUENCY_ARCHITECT',     name: 'Fluency Architect' },
];

export const ACHIEVEMENT_TITLES = [
  { code: 'PERFECT_STREAK',      name: 'Perfect Streak',      description: 'Completar 10 lecciones sin errores' },
  { code: 'PRE_TEST_BREAKER',    name: 'Pre-Test Breaker',    description: 'Aprobar un pre-test al primer intento' },
  { code: 'MIDTERM_HUNTER',      name: 'Midterm Hunter',      description: 'Aprobar un midterm al primer intento' },
  { code: 'FINAL_BOSS_CLEAR',    name: 'Final Boss Clear',    description: 'Aprobar un final exam al primer intento' },
  { code: 'CLEAN_PHASE_RUNNER',  name: 'Clean Phase Runner',  description: 'Completar una fase sin repetir bloques' },
  { code: 'VOICE_SPARK',         name: 'Voice Spark',         description: 'Completar 5 speaking sin fallos' },
  { code: 'SHARP_LISTENER',      name: 'Sharp Listener',      description: 'Completar 10 listening perfectos' },
  { code: 'HIDDEN_PATH_SEEKER',  name: 'Hidden Path Seeker',  description: 'Completar un nivel oculto' },
  { code: 'SECRET_WORLD_WALKER', name: 'Secret World Walker', description: 'Completar 5 niveles ocultos' },
  { code: 'FLUENCY_CORE',        name: 'Fluency Core',        description: 'Llegar al nivel 100' },
];

export function getTitleCodesForLevel(level: number): string[] {
  return LEVEL_TITLE_MAP
    .filter(t => level >= t.minLevel)
    .map(t => t.code);
}
