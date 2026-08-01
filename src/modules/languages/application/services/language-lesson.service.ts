import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { LessonProgressStatus, Prisma, XpSourceType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { LESSON_XP_REWARD } from '../../domain/exam-policy';
import { LanguageXpService } from './language-xp.service';
import { AdventureGenerationService } from './adventure-generation.service';

const DEFAULT_LESSON_PASS_THRESHOLD = 3;

interface PracticeQuestion {
  type?: string;
  question?: string;
  answer?: string;
  options?: string[];
  explanationEs?: string;
}

function normalizeAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOptionLetter(value: string): boolean {
  return ['a', 'b', 'c', 'd'].includes(normalizeAnswer(value));
}

function resolveExpectedAnswer(question: PracticeQuestion, answer: string): string {
  const options = Array.isArray(question.options) ? question.options.map(item => String(item)) : [];
  const normalized = normalizeAnswer(answer);
  if (!options.length || !isOptionLetter(answer)) return answer;

  const letterIndex = normalized.charCodeAt(0) - 97;
  return options[letterIndex] ?? answer;
}

function answersMatch(question: PracticeQuestion, userAnswer: string, expectedAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedExpected = normalizeAnswer(expectedAnswer);
  if (normalizedUser === normalizedExpected) return true;

  const resolvedExpected = resolveExpectedAnswer(question, expectedAnswer);
  if (normalizeAnswer(resolvedExpected) === normalizedUser) return true;

  const resolvedUser = resolveExpectedAnswer(question, userAnswer);
  return normalizeAnswer(resolvedUser) === normalizedExpected;
}

@Injectable()
export class LanguageLessonService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: LanguageXpService,
    private readonly adventureService: AdventureGenerationService,
  ) {}

  async startLesson(languageProfileId: string, lessonId: string) {
    const lesson = await this.prisma.languageAdventureLesson.findUnique({
      where: { id: lessonId },
      include: { phase: true },
    });
    if (!lesson) throw new NotFoundException('Leccion no encontrada');
    if (lesson.phase.languageProfileId !== languageProfileId) {
      throw new ForbiddenException('No pertenece a tu perfil');
    }

    return this.prisma.languageLessonProgress.upsert({
      where: { languageProfileId_lessonId: { languageProfileId, lessonId } },
      create: {
        languageProfileId,
        lessonId,
        status: LessonProgressStatus.IN_PROGRESS,
        attempts: 1,
        startedAt: new Date(),
      },
      update: {
        status: LessonProgressStatus.IN_PROGRESS,
        attempts: { increment: 1 },
        startedAt: new Date(),
      },
    });
  }

  async completeLesson(
    languageProfileId: string,
    lessonId: string,
    data: { answers?: Record<string, unknown>; hintsUsed?: number },
  ) {
    const lesson = await this.prisma.languageAdventureLesson.findUnique({
      where: { id: lessonId },
      include: {
        phase: {
          include: {
            lessons: { orderBy: { lessonNumber: 'asc' } },
          },
        },
      },
    });
    if (!lesson) throw new NotFoundException('Leccion no encontrada');
    if (lesson.phase.languageProfileId !== languageProfileId) {
      throw new ForbiddenException('No pertenece a tu perfil');
    }

    const content = (lesson.content ?? {}) as Record<string, unknown>;
    const practice = Array.isArray(content.practice) ? (content.practice as PracticeQuestion[]) : [];
    const passThreshold = Number(content.passThreshold ?? DEFAULT_LESSON_PASS_THRESHOLD);
    const answers = data.answers ?? {};

    const feedback = practice.map((question, index) => {
      const expectedAnswer = String(question.answer ?? '').trim();
      const userAnswer = String(answers[String(index)] ?? '').trim();
      const isCorrect = answersMatch(question, userAnswer, expectedAnswer);
      return {
        questionIndex: index,
        question: String(question.question ?? ''),
        questionType: String(question.type ?? 'multiple_choice'),
        userAnswer,
        expectedAnswer,
        isCorrect,
        feedback: isCorrect
          ? 'Respuesta correcta.'
          : String(question.explanationEs ?? `La respuesta correcta es "${expectedAnswer}".`),
      };
    });

    const correctCount = feedback.filter(item => item.isCorrect).length;
    const totalQuestions = practice.length;
    const errorsCount = totalQuestions - correctCount;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = correctCount >= passThreshold;
    const progressStatus = passed ? LessonProgressStatus.COMPLETED : LessonProgressStatus.NEEDS_REVIEW;

    const progress = await this.prisma.languageLessonProgress.upsert({
      where: { languageProfileId_lessonId: { languageProfileId, lessonId } },
      create: {
        languageProfileId,
        lessonId,
        status: progressStatus,
        attempts: 1,
        score,
        errorsCount,
        hintsUsed: data.hintsUsed ?? 0,
        ...(passed ? { completedAt: new Date() } : {}),
      },
      update: {
        status: progressStatus,
        score,
        errorsCount,
        hintsUsed: data.hintsUsed ?? 0,
        ...(passed ? { completedAt: new Date() } : {}),
      },
    });

    if (feedback.length > 0) {
      await this.prisma.$transaction(
        feedback.map(item => this.prisma.$executeRaw`
          INSERT INTO "LanguageQuestionAttemptLog" (
            "id",
            "languageProfileId",
            "phaseId",
            "lessonId",
            "sourceType",
            "questionIndex",
            "questionFingerprint",
            "questionText",
            "questionType",
            "userAnswer",
            "expectedAnswer",
            "isCorrect",
            "feedback",
            "createdAt"
          )
          VALUES (
            ${randomUUID()},
            ${languageProfileId},
            ${lesson.phase.id},
            ${lessonId},
            ${'LESSON'},
            ${item.questionIndex},
            ${normalizeAnswer(item.question)},
            ${item.question},
            ${item.questionType},
            ${item.userAnswer || null},
            ${item.expectedAnswer || null},
            ${item.isCorrect},
            ${item.feedback},
            NOW()
          )
        `),
      );
    }

    let xpResult = null;
    if (passed) {
      xpResult = await this.xpService.awardXp(
        languageProfileId,
        XpSourceType.LESSON,
        lessonId,
        LESSON_XP_REWARD,
        `Leccion completada: ${lesson.title}`,
      );
    }

    let nextLessonId: string | null = null;
    if (passed) {
      const nextLesson = lesson.phase.lessons.find(item => item.lessonNumber === lesson.lessonNumber + 1);
      if (nextLesson) {
        nextLessonId = nextLesson.id;
        const nextProgress = await this.prisma.languageLessonProgress.findUnique({
          where: { languageProfileId_lessonId: { languageProfileId, lessonId: nextLesson.id } },
          select: { status: true },
        });
        if (!nextProgress || nextProgress.status === LessonProgressStatus.LOCKED) {
          await this.prisma.languageLessonProgress.upsert({
          where: { languageProfileId_lessonId: { languageProfileId, lessonId: nextLesson.id } },
          create: {
            languageProfileId,
            lessonId: nextLesson.id,
            status: LessonProgressStatus.AVAILABLE,
          },
          update: {
            status: LessonProgressStatus.AVAILABLE,
          },
          });
        }
      }
    }

    let hiddenLevelUnlocked = false;
    if (passed && [10, 20, 30].includes(lesson.lessonNumber) && errorsCount === 0 && (data.hintsUsed ?? 0) === 0) {
      const blockStart = lesson.lessonNumber - 9;
      const blockLessons = lesson.phase.lessons.filter(
        item => item.lessonNumber >= blockStart && item.lessonNumber <= lesson.lessonNumber,
      );
      const allProgress = await this.prisma.languageLessonProgress.findMany({
        where: { languageProfileId, lessonId: { in: blockLessons.map(item => item.id) } },
      });
      const allPerfect = allProgress.length === blockLessons.length &&
        allProgress.every(item => item.errorsCount === 0 && item.hintsUsed === 0 && item.status === LessonProgressStatus.COMPLETED);

      if (allPerfect) {
        const existingHidden = await this.prisma.languageHiddenLevel.findFirst({
          where: {
            phaseId: lesson.phase.id,
            languageProfileId,
            unlockBlockStart: blockStart,
            unlockBlockEnd: lesson.lessonNumber,
          },
        });

        if (!existingHidden) {
          await this.prisma.languageHiddenLevel.create({
            data: {
              phaseId: lesson.phase.id,
              languageProfileId,
              unlockBlockStart: blockStart,
              unlockBlockEnd: lesson.lessonNumber,
              title: `Hidden Challenge: Block ${blockStart}-${lesson.lessonNumber}`,
              content: { type: 'conversation', description: 'Surprise conversation challenge' } as Prisma.InputJsonValue,
            },
          });
          hiddenLevelUnlocked = true;
        }
      }
    }

    const phaseState = await this.adventureService.syncPhaseState(lesson.phase.id, languageProfileId);

    return {
      progress,
      xpResult,
      hiddenLevelUnlocked,
      passed,
      nextLessonId,
      phaseState,
      evaluation: {
        score,
        passThreshold,
        totalQuestions,
        correctCount,
        errorsCount,
        feedback,
      },
    };
  }
}
