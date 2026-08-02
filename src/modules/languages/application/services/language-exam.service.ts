import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { LessonProgressStatus, Prisma, XpSourceType } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';
import { EXAM_XP_REWARD, MAX_EXAM_ATTEMPTS, getReviewLessonsForExam } from 'src/domain/languages/exam-policy';
import { LanguageXpService } from './language-xp.service';
import { AdventureGenerationService } from './adventure-generation.service';

interface ExamQuestion {
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

function resolveExpectedAnswer(question: ExamQuestion, answer: string): string {
  const options = Array.isArray(question.options) ? question.options.map(item => String(item)) : [];
  const normalized = normalizeAnswer(answer);
  if (!options.length || !isOptionLetter(answer)) return answer;

  const letterIndex = normalized.charCodeAt(0) - 97;
  return options[letterIndex] ?? answer;
}

function answersMatch(question: ExamQuestion, userAnswer: string, expectedAnswer: string): boolean {
  const normalizedUser = normalizeAnswer(userAnswer);
  const normalizedExpected = normalizeAnswer(expectedAnswer);
  if (normalizedUser === normalizedExpected) return true;

  const resolvedExpected = resolveExpectedAnswer(question, expectedAnswer);
  if (normalizeAnswer(resolvedExpected) === normalizedUser) return true;

  const resolvedUser = resolveExpectedAnswer(question, userAnswer);
  return normalizeAnswer(resolvedUser) === normalizedExpected;
}

@Injectable()
export class LanguageExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly xpService: LanguageXpService,
    private readonly adventureService: AdventureGenerationService,
  ) {}

  async submitAttempt(
    languageProfileId: string,
    examId: string,
    answers: Record<string, unknown>,
  ) {
    const exam = await this.prisma.languageAdventureExam.findUnique({
      where: { id: examId },
      include: { phase: true, attempts: { where: { languageProfileId } } },
    });
    if (!exam) throw new NotFoundException('Examen no encontrado');
    if (exam.phase.languageProfileId !== languageProfileId) {
      throw new ForbiddenException('No pertenece a tu perfil');
    }

    const prevAttempts = exam.attempts.filter(item => item.languageProfileId === languageProfileId);
    if (prevAttempts.length >= MAX_EXAM_ATTEMPTS) {
      throw new BadRequestException('Has agotado los intentos para este examen');
    }

    const questions = Array.isArray(exam.questions) ? (exam.questions as ExamQuestion[]) : [];
    const feedback = questions.map((question, index) => {
      const expectedAnswer = String(question.answer ?? '').trim();
      const userAnswer = String(answers[String(index)] ?? '').trim();
      const isCorrect = answersMatch(question, userAnswer, expectedAnswer);
      return {
        questionIndex: index,
        question: String(question.question ?? ''),
        questionType: String(question.type ?? 'multiple_choice'),
        expectedAnswer,
        userAnswer,
        isCorrect,
        feedback: isCorrect
          ? 'Respuesta correcta.'
          : String(question.explanationEs ?? `La respuesta correcta es "${expectedAnswer}".`),
      };
    });

    const correctCount = feedback.filter(item => item.isCorrect).length;
    const totalQuestions = questions.length;
    const score = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passed = score >= exam.passScore;
    const attemptNumber = prevAttempts.length + 1;

    const attempt = await this.prisma.languageExamAttempt.create({
      data: {
        languageProfileId,
        examId,
        attemptNumber,
        answers: answers as Prisma.InputJsonValue,
        score,
        passed,
        feedback: feedback as Prisma.InputJsonValue,
        xpAwarded: passed ? EXAM_XP_REWARD : 0,
      },
    });

    if (feedback.length > 0) {
      await this.prisma.$transaction(
        feedback.map(item => this.prisma.$executeRaw`
          INSERT INTO "LanguageQuestionAttemptLog" (
            "id",
            "languageProfileId",
            "phaseId",
            "examId",
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
            ${exam.phase.id},
            ${examId},
            ${'EXAM'},
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
        XpSourceType.EXAM,
        examId,
        EXAM_XP_REWARD,
        `Examen aprobado: ${exam.title}`,
      );
    }

    let reviewRequired = false;
    if (!passed && attemptNumber >= MAX_EXAM_ATTEMPTS) {
      const { start, end } = getReviewLessonsForExam(exam.type as 'PRE_TEST' | 'MIDTERM' | 'FINAL_EXAM');
      const blockLessons = await this.prisma.languageAdventureLesson.findMany({
        where: { phaseId: exam.phase.id, lessonNumber: { gte: start, lte: end } },
      });

      for (const lesson of blockLessons) {
        await this.prisma.languageLessonProgress.upsert({
          where: { languageProfileId_lessonId: { languageProfileId, lessonId: lesson.id } },
          create: { languageProfileId, lessonId: lesson.id, status: LessonProgressStatus.NEEDS_REVIEW },
          update: { status: LessonProgressStatus.NEEDS_REVIEW },
        });
      }

      reviewRequired = true;
    }

    const phaseState = await this.adventureService.syncPhaseState(exam.phase.id, languageProfileId);

    return {
      attempt,
      xpResult,
      passed,
      reviewRequired,
      phaseState,
      evaluation: {
        score,
        correctCount,
        totalQuestions,
        passScore: exam.passScore,
        feedback,
      },
    };
  }

  async getExam(languageProfileId: string, examId: string) {
    const exam = await this.prisma.languageAdventureExam.findUnique({
      where: { id: examId },
      include: {
        phase: true,
        attempts: { where: { languageProfileId }, orderBy: { attemptNumber: 'asc' } },
      },
    });
    if (!exam) throw new NotFoundException('Examen no encontrado');
    if (exam.phase.languageProfileId !== languageProfileId) {
      throw new ForbiddenException('No pertenece a tu perfil');
    }
    return exam;
  }
}
