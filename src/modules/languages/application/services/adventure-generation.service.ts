import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { LLM_PORT, LlmPort } from 'src/application/ports/llm.port';
import { LanguageTopicMemoryService } from './language-topic-memory.service';

const LESSON_TYPES = [
  'LESSON', 'LESSON', 'VOCABULARY', 'PRACTICE', 'LESSON',
  'SPEAKING', 'LISTENING', 'PRACTICE', 'REVIEW', 'LESSON',
] as const;

const LESSON_QUESTION_COUNT = 5;
const LESSON_PASS_THRESHOLD = 3;
const EXAM_QUESTION_COUNT = 20;

const LESSON_FOCUS_BLUEPRINTS = [
  'conceptos base y expresiones esenciales',
  'vocabulario de uso inmediato',
  'frases cortas y estructuras guiadas',
  'uso en situaciones cotidianas',
  'preguntas y respuestas frecuentes',
  'pronunciacion y fluidez controlada',
  'comprension de instrucciones simples',
  'aplicacion escrita y correccion',
  'errores comunes y autocorreccion',
  'integracion practica del bloque',
  'ampliacion de vocabulario funcional',
  'contrastes de significado y contexto',
  'construccion de oraciones utiles',
  'conectores y continuidad de ideas',
  'variaciones de tiempo verbal',
  'conversacion guiada por escenarios',
  'comprension auditiva con pistas',
  'produccion escrita de mayor precision',
  'revision comparativa de patrones',
  'bloque integrado con micro-retos',
  'matices y usos menos evidentes',
  'preguntas abiertas y respuesta elaborada',
  'seleccion natural de estructuras',
  'mezcla de vocabulario y gramatica',
  'reformulacion y expansion de ideas',
  'speaking con situaciones realistas',
  'listening con detalles clave',
  'practica acumulativa de decisiones',
  'repaso de puntos debiles del bloque',
  'cierre aplicado del tema completo',
] as const;

type LessonType = 'LESSON' | 'SPEAKING' | 'LISTENING' | 'PRACTICE' | 'REVIEW';

interface PracticeQuestion {
  type: string;
  question: string;
  answer: string;
  options?: string[];
  explanationEs?: string;
}

interface LessonContent {
  intro: string;
  vocabulary: { term: string; meaningEs: string; example: string }[];
  grammar: string;
  practice: PracticeQuestion[];
  feedbackRules: string[];
  passThreshold?: number;
  generated?: boolean;
}

interface GeneratedQuestion {
  type: string;
  question: string;
  answer: string;
  options?: string[];
  explanationEs?: string;
  generated?: boolean;
}

function normalizeQuestionText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeOptions(
  options: unknown,
  answer: string,
): string[] | undefined {
  if (!Array.isArray(options)) return undefined;
  const cleaned = options
    .map(opt => String(opt).trim())
    .filter(Boolean);
  if (!cleaned.length) return undefined;
  if (!cleaned.some(opt => opt.toLowerCase() === answer.toLowerCase())) {
    cleaned[0] = answer;
  }
  return cleaned.slice(0, 4);
}

function dedupeGeneratedQuestions(
  questions: GeneratedQuestion[],
  blacklist: Set<string>,
  expectedCount: number,
): GeneratedQuestion[] {
  const seen = new Set(blacklist);
  const unique: GeneratedQuestion[] = [];

  for (const item of questions) {
    const question = String(item.question ?? '').trim();
    const answer = String(item.answer ?? '').trim();
    if (!question || !answer) continue;

    const fingerprint = normalizeQuestionText(question);
    if (!fingerprint || seen.has(fingerprint)) continue;

    seen.add(fingerprint);
    unique.push({
      type: String(item.type ?? 'multiple_choice'),
      question,
      answer,
      options: sanitizeOptions(item.options, answer),
      explanationEs: item.explanationEs ? String(item.explanationEs).trim() : undefined,
      generated: true,
    });

    if (unique.length >= expectedCount) break;
  }

  return unique;
}

function collectQuestionFingerprints(payload: Prisma.JsonValue): string[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray(payload)) return [];
  return payload
    .map(item => {
      if (!item || typeof item !== 'object') return '';
      const value = (item as Record<string, unknown>).question;
      return typeof value === 'string' ? normalizeQuestionText(value) : '';
    })
    .filter(Boolean);
}

function buildLessonTemplate(
  lessonNumber: number,
  topic: string,
  cefrLevel: string,
): { type: LessonType; title: string; objective: string; focus: string } {
  const block = Math.ceil(lessonNumber / 10);
  const pos = ((lessonNumber - 1) % 10) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
  const rawType = LESSON_TYPES[pos];
  const type: LessonType = (rawType === 'VOCABULARY' ? 'LESSON' : rawType) as LessonType;

  const blockLabels = ['Foundation', 'Expansion', 'Mastery'];
  const typeLabels: Record<string, string> = {
    LESSON: 'Lesson',
    SPEAKING: 'Speaking Practice',
    LISTENING: 'Listening Lab',
    PRACTICE: 'Practice',
    REVIEW: 'Review',
    VOCABULARY: 'Vocabulary',
  };

  const focus = LESSON_FOCUS_BLUEPRINTS[lessonNumber - 1] ?? 'aplicacion practica';
  const combinedFocus =
    focus.includes('y') || focus.includes('con')
      ? focus
      : `${focus} y contexto funcional`;

  return {
    type,
    focus: combinedFocus,
    title: `${typeLabels[rawType] ?? 'Lesson'} ${lessonNumber}: ${topic} - ${combinedFocus}`,
    objective: `Desglosar ${topic} en el microtema "${combinedFocus}" para practicarlo a nivel ${cefrLevel} sin repetir ejercicios previos.`,
  };
}

function buildExamQuestions(
  topic: string,
  examType: string,
  count = EXAM_QUESTION_COUNT,
  blacklist = new Set<string>(),
): GeneratedQuestion[] {
  const prefix = examType === 'PRE_TEST' ? 'basic' : examType === 'MIDTERM' ? 'intermediate' : 'advanced';
  const items: GeneratedQuestion[] = [];
  let cursor = 0;

  while (items.length < count) {
    const question = `[${prefix}] Question ${cursor + 1} about ${topic} with a unique scenario`;
    const fingerprint = normalizeQuestionText(question);
    cursor += 1;
    if (blacklist.has(fingerprint)) continue;
    blacklist.add(fingerprint);
    items.push({
      type: 'multiple_choice',
      question,
      answer: 'A',
      options: ['A', 'B', 'C', 'D'],
      explanationEs: `Esta pregunta valida un punto clave del tema ${topic}.`,
      generated: false,
    });
  }

  return items;
}

@Injectable()
export class AdventureGenerationService {
  private readonly logger = new Logger(AdventureGenerationService.name);
  private readonly MODEL = 'qwen3:4b';

  constructor(
    private readonly prisma: PrismaService,
    @Inject(LLM_PORT)
    private readonly llm: LlmPort,
    private readonly topicMemory: LanguageTopicMemoryService,
  ) {}

  async generatePhase(languageProfileId: string): Promise<{ phaseId: string; alreadyExisted: boolean }> {
    const existing = await this.prisma.languageAdventurePhase.findFirst({
      where: { languageProfileId, status: { in: ['ACTIVE', 'DRAFT'] } },
    });
    if (existing) return { phaseId: existing.id, alreadyExisted: true };

    const { topic, topicSlug, difficultyLevel } = await this.topicMemory.selectNextTopic(languageProfileId);
    const cefrMap: Record<number, string> = { 1: 'A1', 2: 'B1', 3: 'B2' };
    const cefrLevel = cefrMap[difficultyLevel] ?? 'A1';
    const phaseCount = await this.prisma.languageAdventurePhase.count({ where: { languageProfileId } });

    const lessons = Array.from({ length: 30 }, (_, i) => {
      const lessonNumber = i + 1;
      const template = buildLessonTemplate(lessonNumber, topic, cefrLevel);
      return {
        lessonNumber,
        type: template.type,
        title: template.title,
        objective: template.objective,
        content: {
          intro: '',
          vocabulary: [],
          grammar: '',
          practice: [],
          feedbackRules: [],
          passThreshold: LESSON_PASS_THRESHOLD,
          generated: false,
        } as Prisma.InputJsonValue,
        expectedXp: 10,
        unlockAfter: lessonNumber > 1 ? lessonNumber - 1 : null,
      };
    });

    const exams = [
      {
        type: 'PRE_TEST' as const,
        unlockAfter: 10,
        title: `Pre-Test: ${topic}`,
        questions: buildExamQuestions(topic, 'PRE_TEST') as unknown as Prisma.InputJsonValue,
        passScore: 80,
        maxAttempts: 2,
        xpReward: 20,
      },
      {
        type: 'MIDTERM' as const,
        unlockAfter: 20,
        title: `Midterm: ${topic}`,
        questions: buildExamQuestions(topic, 'MIDTERM') as unknown as Prisma.InputJsonValue,
        passScore: 80,
        maxAttempts: 2,
        xpReward: 20,
      },
      {
        type: 'FINAL_EXAM' as const,
        unlockAfter: 30,
        title: `Final Exam: ${topic}`,
        questions: buildExamQuestions(topic, 'FINAL_EXAM') as unknown as Prisma.InputJsonValue,
        passScore: 80,
        maxAttempts: 2,
        xpReward: 20,
      },
    ];

    const phase = await this.prisma.languageAdventurePhase.create({
      data: {
        languageProfileId,
        phaseNumber: phaseCount + 1,
        topic,
        topicSlug,
        difficultyLevel,
        cefrLevel,
        status: 'ACTIVE',
        generatedByModel: this.MODEL,
        generatedAt: new Date(),
        startedAt: new Date(),
        lessons: { create: lessons },
        exams: { create: exams },
      },
    });

    const firstLesson = await this.prisma.languageAdventureLesson.findFirst({
      where: { phaseId: phase.id, lessonNumber: 1 },
    });

    if (firstLesson) {
      await this.prisma.languageLessonProgress.upsert({
        where: { languageProfileId_lessonId: { languageProfileId, lessonId: firstLesson.id } },
        create: { languageProfileId, lessonId: firstLesson.id, status: 'AVAILABLE' },
        update: { status: 'AVAILABLE' },
      });
    }

    await this.topicMemory.markTopicUsed(languageProfileId, topicSlug, difficultyLevel);
    await this.prisma.languageProfile.update({
      where: { id: languageProfileId },
      data: { currentPhaseId: phase.id },
    });

    return { phaseId: phase.id, alreadyExisted: false };
  }

  async listPhases(languageProfileId: string) {
    return this.prisma.languageAdventurePhase.findMany({
      where: { languageProfileId },
      orderBy: { phaseNumber: 'desc' },
      select: {
        id: true,
        phaseNumber: true,
        topic: true,
        topicSlug: true,
        cefrLevel: true,
        difficultyLevel: true,
        status: true,
        startedAt: true,
        completedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async syncPhaseState(phaseId: string, languageProfileId: string) {
    const phase = await this.prisma.languageAdventurePhase.findUnique({
      where: { id: phaseId },
      include: {
        lessons: {
          select: { id: true, lessonNumber: true },
          orderBy: { lessonNumber: 'asc' },
        },
        exams: {
          select: { id: true, type: true },
          orderBy: { unlockAfter: 'asc' },
        },
        languageProfile: {
          select: { id: true, currentPhaseId: true },
        },
      },
    });

    if (!phase || phase.languageProfileId !== languageProfileId) {
      throw new NotFoundException('Fase no encontrada');
    }

    const lessonProgress = await this.prisma.languageLessonProgress.findMany({
      where: {
        languageProfileId,
        lessonId: { in: phase.lessons.map(item => item.id) },
      },
      select: { lessonId: true, status: true },
    });
    const lessonProgressMap = new Map(lessonProgress.map(item => [item.lessonId, item.status]));
    const allLessonsCompleted = phase.lessons.every(
      lesson => lessonProgressMap.get(lesson.id) === 'COMPLETED',
    );

    const examAttempts = await this.prisma.languageExamAttempt.findMany({
      where: {
        languageProfileId,
        examId: { in: phase.exams.map(item => item.id) },
      },
      orderBy: { attemptNumber: 'desc' },
      select: { examId: true, passed: true },
    });
    const passedExamIds = new Set(
      examAttempts.filter(item => item.passed).map(item => item.examId),
    );
    const allExamsPassed = phase.exams.every(exam => passedExamIds.has(exam.id));

    const shouldComplete = allLessonsCompleted && allExamsPassed;
    const newStatus = shouldComplete ? 'COMPLETED' : 'ACTIVE';

    await this.prisma.languageAdventurePhase.update({
      where: { id: phase.id },
      data: {
        status: newStatus,
        startedAt: phase.startedAt ?? new Date(),
        completedAt: shouldComplete ? phase.completedAt ?? new Date() : null,
      },
    });

    if (shouldComplete && phase.languageProfile.currentPhaseId === phase.id) {
      await this.prisma.languageProfile.update({
        where: { id: languageProfileId },
        data: { currentPhaseId: null },
      });
    } else if (!shouldComplete && phase.languageProfile.currentPhaseId !== phase.id) {
      await this.prisma.languageProfile.update({
        where: { id: languageProfileId },
        data: { currentPhaseId: phase.id },
      });
    }

    return {
      phaseId: phase.id,
      status: newStatus,
      completed: shouldComplete,
      allLessonsCompleted,
      allExamsPassed,
    };
  }

  async ensureLessonContent(lessonId: string): Promise<Prisma.JsonValue> {
    const lesson = await this.prisma.languageAdventureLesson.findUnique({
      where: { id: lessonId },
      include: {
        phase: {
          select: {
            id: true,
            topic: true,
            cefrLevel: true,
            difficultyLevel: true,
            languageProfileId: true,
            lessons: { select: { id: true, content: true } },
            exams: { select: { id: true, questions: true } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Lesson not found');

    const content = lesson.content as Record<string, unknown>;
    if (content?.generated === true) return lesson.content;

    const blacklist = await this.buildQuestionBlacklist(
      lesson.phase.languageProfileId,
      lesson.phase.lessons,
      lesson.phase.exams,
      lesson.id,
      null,
    );
    const focus = this.extractLessonFocus(lesson.title, lesson.phase.topic ?? 'English');
    const generatedContent = await this.generateSingleLessonContent(
      lesson.title,
      lesson.objective,
      lesson.type,
      lesson.phase.topic ?? 'English',
      lesson.phase.cefrLevel ?? 'A1',
      focus,
      blacklist,
    );

    const updated = await this.prisma.languageAdventureLesson.update({
      where: { id: lessonId },
      data: { content: generatedContent as unknown as Prisma.InputJsonValue },
    });

    return updated.content;
  }

  private async generateSingleLessonContent(
    title: string,
    objective: string,
    type: string,
    topic: string,
    cefrLevel: string,
    focus: string,
    blacklist: Set<string>,
  ): Promise<LessonContent> {
    const isAudio = type === 'SPEAKING' || type === 'LISTENING';
    const blacklistPreview = Array.from(blacklist).slice(0, 25).join(' | ') || 'none';

    const prompt = `You are generating one English micro-lesson for a Spanish-speaking student.
Level: ${cefrLevel}
Main topic: ${topic}
Lesson title: "${title}"
Lesson objective: "${objective}"
Lesson focus: "${focus}"
Lesson type: ${type}

Return ONLY valid JSON with this exact shape:
{
  "intro": "2-3 sentences in Spanish",
  "vocabulary": [
    {"term":"English word","meaningEs":"Spanish meaning","example":"Example sentence in English"}
  ],
  "grammar": "1-2 short sentences in Spanish",
  "practice": [
    {
      "type":"multiple_choice",
      "question":"Question in English",
      "answer":"Correct answer",
      "options":["A","B","C","D"],
      "explanationEs":"Retroalimentacion breve en espanol"
    }
  ],
  "feedbackRules":["Regla 1 en espanol","Regla 2 en espanol"],
  "passThreshold": 3
}

Mandatory rules:
- Create exactly ${LESSON_QUESTION_COUNT} practice questions.
- The lesson passes only with at least ${LESSON_PASS_THRESHOLD} correct answers.
- Every practice question must be unique and attack a different micro-skill of "${focus}".
- Never repeat or paraphrase these blacklisted questions: ${blacklistPreview}
- If the focus is too simple, combine it with the most natural adjacent micro-skill, but keep the explanation granular.
- Give explicit feedback in explanationEs for each question so the student learns from mistakes.
- ${isAudio ? 'Include at least 1 speaking or listening style prompt in practice.' : 'Focus on reading or writing practice.'}
- Keep all student-facing explanations in Spanish and the actual exercise content in English.`;

    try {
      const result = await this.llm.chat({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        options: { temperature: 0.5, num_predict: 2200 },
      });

      const raw = result.content.trim()
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

      const parsed = JSON.parse(raw) as LessonContent;
      const uniquePractice = dedupeGeneratedQuestions(
        Array.isArray(parsed.practice) ? parsed.practice : [],
        blacklist,
        LESSON_QUESTION_COUNT,
      );

      const practice = this.completeLessonQuestions(uniquePractice, topic, focus, blacklist);
      return {
        intro: String(parsed.intro ?? '').trim(),
        vocabulary: Array.isArray(parsed.vocabulary) ? parsed.vocabulary.slice(0, 5) : [],
        grammar: String(parsed.grammar ?? '').trim(),
        practice,
        feedbackRules: Array.isArray(parsed.feedbackRules)
          ? parsed.feedbackRules.map(rule => String(rule).trim()).filter(Boolean).slice(0, 5)
          : [],
        passThreshold: LESSON_PASS_THRESHOLD,
        generated: true,
      };
    } catch (err) {
      this.logger.warn(`Lesson content generation failed for "${title}": ${String(err)}`);
      return this.fallbackLessonContent(objective, topic, cefrLevel, focus, blacklist);
    }
  }

  private fallbackLessonContent(
    objective: string,
    topic: string,
    cefrLevel: string,
    focus: string,
    blacklist: Set<string>,
  ): LessonContent {
    return {
      intro: `En esta leccion aprenderas ${topic} a nivel ${cefrLevel}, concentrandote en ${focus}. ${objective}`,
      vocabulary: [
        { term: topic, meaningEs: 'tema principal', example: `We are studying ${topic} today.` },
        { term: 'practice', meaningEs: 'practica', example: `Practice helps you improve every day.` },
        { term: 'question', meaningEs: 'pregunta', example: `Can you answer this question?` },
        { term: 'answer', meaningEs: 'respuesta', example: `Your answer is very clear.` },
        { term: 'example', meaningEs: 'ejemplo', example: `This example shows the pattern.` },
      ],
      grammar: `Trabaja estructuras simples relacionadas con ${topic} y enfocate en ${focus}.`,
      practice: this.completeLessonQuestions([], topic, focus, blacklist),
      feedbackRules: [
        'Lee cada pregunta con calma antes de responder.',
        'Si fallas, revisa la explicacion y compara la estructura correcta.',
        'Repite en voz alta las respuestas correctas para fijarlas mejor.',
      ],
      passThreshold: LESSON_PASS_THRESHOLD,
      generated: true,
    };
  }

  async ensureExamQuestions(examId: string): Promise<Prisma.JsonValue> {
    const exam = await this.prisma.languageAdventureExam.findUnique({
      where: { id: examId },
      include: {
        phase: {
          select: {
            id: true,
            topic: true,
            cefrLevel: true,
            languageProfileId: true,
            lessons: { select: { id: true, content: true } },
            exams: { select: { id: true, questions: true } },
          },
        },
      },
    });
    if (!exam) throw new NotFoundException('Exam not found');

    const questions = exam.questions as Array<Record<string, unknown>>;
    if (Array.isArray(questions) && questions.some(q => q.generated === true) && questions.length >= EXAM_QUESTION_COUNT) {
      return exam.questions;
    }

    const blacklist = await this.buildQuestionBlacklist(
      exam.phase.languageProfileId,
      exam.phase.lessons,
      exam.phase.exams,
      null,
      exam.id,
    );
    const generated = await this.generateExamQuestions(
      exam.phase.topic ?? 'English',
      exam.phase.cefrLevel ?? 'A1',
      exam.type,
      blacklist,
    );

    const updated = await this.prisma.languageAdventureExam.update({
      where: { id: examId },
      data: { questions: generated as unknown as Prisma.InputJsonValue },
    });

    return updated.questions;
  }

  private async generateExamQuestions(
    topic: string,
    cefrLevel: string,
    examType: string,
    blacklist: Set<string>,
  ): Promise<GeneratedQuestion[]> {
    const difficulty = examType === 'PRE_TEST' ? 'basic' : examType === 'MIDTERM' ? 'intermediate' : 'advanced';
    const blacklistPreview = Array.from(blacklist).slice(0, 40).join(' | ') || 'none';

    const prompt = `Generate ${EXAM_QUESTION_COUNT} unique ${difficulty} English test questions about "${topic}" for a ${cefrLevel} Spanish-speaking student.
Return ONLY valid JSON array:
[{
  "type":"multiple_choice",
  "question":"Question in English",
  "answer":"Correct option",
  "options":["A","B","C","D"],
  "explanationEs":"Retroalimentacion breve en espanol",
  "generated":true
}]

Mandatory rules:
- Exactly ${EXAM_QUESTION_COUNT} questions.
- No repeated questions or paraphrases.
- Cover different subtopics and skills of "${topic}".
- Never reuse or paraphrase these blacklisted questions: ${blacklistPreview}
- Each item must include explanationEs.`;

    try {
      const result = await this.llm.chat({
        model: this.MODEL,
        messages: [{ role: 'user', content: prompt }],
        options: { temperature: 0.4, num_predict: 2600 },
      });

      const raw = result.content.trim()
        .replace(/^```(?:json)?\n?/, '')
        .replace(/\n?```$/, '')
        .trim();

      const parsed = JSON.parse(raw);
      const uniqueQuestions = dedupeGeneratedQuestions(
        Array.isArray(parsed) ? parsed : [],
        blacklist,
        EXAM_QUESTION_COUNT,
      );

      return this.completeExamQuestions(uniqueQuestions, topic, examType, blacklist);
    } catch (err) {
      this.logger.warn(`Exam generation failed for "${topic}" (${examType}): ${String(err)}`);
      return this.completeExamQuestions([], topic, examType, blacklist);
    }
  }

  private completeLessonQuestions(
    baseQuestions: GeneratedQuestion[],
    topic: string,
    focus: string,
    blacklist: Set<string>,
  ): PracticeQuestion[] {
    const questions = [...baseQuestions];
    let cursor = 0;

    while (questions.length < LESSON_QUESTION_COUNT) {
      const fallback = this.buildFallbackLessonQuestion(topic, focus, cursor);
      const fingerprint = normalizeQuestionText(fallback.question);
      cursor += 1;
      if (blacklist.has(fingerprint)) continue;
      blacklist.add(fingerprint);
      questions.push({ ...fallback, generated: true });
    }

    return questions.slice(0, LESSON_QUESTION_COUNT).map(question => ({
      type: question.type,
      question: question.question,
      answer: question.answer,
      options: question.options,
      explanationEs: question.explanationEs ?? 'Revisa la estructura correcta y vuelve a intentarlo.',
    }));
  }

  private completeExamQuestions(
    baseQuestions: GeneratedQuestion[],
    topic: string,
    examType: string,
    blacklist: Set<string>,
  ): GeneratedQuestion[] {
    const questions = [...baseQuestions];
    let cursor = 0;

    while (questions.length < EXAM_QUESTION_COUNT) {
      const fallback = this.buildFallbackExamQuestion(topic, examType, cursor);
      const fingerprint = normalizeQuestionText(fallback.question);
      cursor += 1;
      if (blacklist.has(fingerprint)) continue;
      blacklist.add(fingerprint);
      questions.push({ ...fallback, generated: true });
    }

    return questions.slice(0, EXAM_QUESTION_COUNT);
  }

  private buildFallbackLessonQuestion(topic: string, focus: string, cursor: number): PracticeQuestion {
    const variants: PracticeQuestion[] = [
      {
        type: 'multiple_choice',
        question: `Choose the sentence that best matches ${topic} in a ${focus} context.`,
        answer: `I can use ${topic} in a simple sentence.`,
        options: [
          `I can use ${topic} in a simple sentence.`,
          `${topic} can using sentence I.`,
          `Sentence simple ${topic} use.`,
          `I am sentence ${topic}.`,
        ],
        explanationEs: `La opcion correcta mantiene orden natural y relaciona ${topic} con ${focus}.`,
      },
      {
        type: 'fill_blank',
        question: `Complete the sentence: "Today we practice ${topic} with ____ ideas."`,
        answer: 'clear',
        explanationEs: 'La palabra "clear" encaja para expresar ideas claras en contexto.',
      },
      {
        type: 'multiple_choice',
        question: `Which question helps you talk about ${topic} more clearly?`,
        answer: `What do you usually do with ${topic}?`,
        options: [
          `What do you usually do with ${topic}?`,
          `Usually do what topic you?`,
          `${topic} usually what do?`,
          `Do topic what usually?`,
        ],
        explanationEs: 'La respuesta correcta forma una pregunta natural en ingles.',
      },
      {
        type: 'fill_blank',
        question: `Write one word to complete: "This example is very ____ for ${topic}."`,
        answer: 'useful',
        explanationEs: 'Se usa "useful" para indicar que el ejemplo sirve para aprender.',
      },
      {
        type: 'multiple_choice',
        question: `Pick the best correction for a common mistake about ${topic}.`,
        answer: `I understand the main idea about ${topic}.`,
        options: [
          `I understand the main idea about ${topic}.`,
          `I understand main idea about the ${topic}ing.`,
          `Main idea I understand topic about.`,
          `I am understand ${topic}.`,
        ],
        explanationEs: 'La respuesta correcta usa verbo y complemento en el orden esperado.',
      },
    ];

    return variants[cursor % variants.length];
  }

  private buildFallbackExamQuestion(topic: string, examType: string, cursor: number): GeneratedQuestion {
    const difficultyLabel = examType === 'PRE_TEST' ? 'basic' : examType === 'MIDTERM' ? 'intermediate' : 'advanced';
    return {
      type: 'multiple_choice',
      question: `In this ${difficultyLabel} ${topic} scenario ${cursor + 1}, choose the most natural English option.`,
      answer: `Option A about ${topic} scenario ${cursor + 1}`,
      options: [
        `Option A about ${topic} scenario ${cursor + 1}`,
        `Option B with a grammar mistake ${cursor + 1}`,
        `Option C with wrong word order ${cursor + 1}`,
        `Option D with the wrong meaning ${cursor + 1}`,
      ],
      explanationEs: `La opcion correcta conserva el sentido natural para ${topic} en el escenario ${cursor + 1}.`,
      generated: true,
    };
  }

  private extractLessonFocus(title: string, topic: string): string {
    const pieces = title.split(' - ');
    if (pieces.length > 1) return pieces.slice(1).join(' - ').trim();
    return `${topic} y uso funcional`;
  }

  private async buildQuestionBlacklist(
    languageProfileId: string,
    lessons: Array<{ id: string; content: Prisma.JsonValue }>,
    exams: Array<{ id: string; questions: Prisma.JsonValue }>,
    currentLessonId: string | null,
    currentExamId: string | null,
  ): Promise<Set<string>> {
    const blacklist = new Set<string>();

    for (const lesson of lessons) {
      if (lesson.id === currentLessonId) continue;
      const payload = lesson.content as Record<string, unknown>;
      if (Array.isArray(payload?.practice)) {
        for (const item of payload.practice as Array<Record<string, unknown>>) {
          if (typeof item?.question === 'string') blacklist.add(normalizeQuestionText(item.question));
        }
      }
    }

    for (const exam of exams) {
      if (exam.id === currentExamId) continue;
      for (const fingerprint of collectQuestionFingerprints(exam.questions)) {
        blacklist.add(fingerprint);
      }
    }

    const loggedQuestions = await this.prisma.$queryRaw<Array<{ questionFingerprint: string }>>`
      SELECT "questionFingerprint"
      FROM "LanguageQuestionAttemptLog"
      WHERE "languageProfileId" = ${languageProfileId}
      ORDER BY "createdAt" DESC
      LIMIT 200
    `;

    loggedQuestions.forEach((item: { questionFingerprint: string }) => blacklist.add(item.questionFingerprint));
    return blacklist;
  }

  async getPhase(phaseId: string, languageProfileId?: string) {
    const phase = await this.prisma.languageAdventurePhase.findUnique({
      where: { id: phaseId },
      include: {
        lessons: {
          orderBy: { lessonNumber: 'asc' },
          select: { id: true, lessonNumber: true, type: true, title: true, objective: true, unlockAfter: true },
        },
        exams: {
          orderBy: { unlockAfter: 'asc' },
          select: { id: true, type: true, unlockAfter: true, title: true, passScore: true, maxAttempts: true },
        },
        hiddenLevels: { select: { id: true, unlockBlockStart: true, unlockBlockEnd: true, completedAt: true } },
      },
    });
    if (!phase) return null;

    if (languageProfileId) {
      const progressRecords = await this.prisma.languageLessonProgress.findMany({
        where: { languageProfileId, lessonId: { in: phase.lessons.map(item => item.id) } },
      });
      const progressMap = Object.fromEntries(progressRecords.map(item => [item.lessonId, item.status]));
      const examAttempts = await this.prisma.languageExamAttempt.findMany({
        where: { languageProfileId, examId: { in: phase.exams.map(item => item.id) } },
        orderBy: { attemptNumber: 'asc' },
        select: { examId: true, score: true, passed: true, attemptNumber: true },
      });
      const attemptsByExam = new Map<string, Array<{ score: number; passed: boolean; attemptNumber: number }>>();
      for (const attempt of examAttempts) {
        const current = attemptsByExam.get(attempt.examId) ?? [];
        current.push(attempt);
        attemptsByExam.set(attempt.examId, current);
      }
      const lessonsWithProgress = phase.lessons.map(item => ({
        ...item,
        status: progressMap[item.id] ?? 'LOCKED',
      }));
      const examsWithAttempts = phase.exams.map(item => ({
        ...item,
        attempts: attemptsByExam.get(item.id) ?? [],
      }));
      return { ...phase, lessons: lessonsWithProgress, exams: examsWithAttempts };
    }

    return phase;
  }
}
