import {
  Controller, Get, Post, Body, Inject, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import {
  LANGUAGE_PROFILE_REPOSITORY_PORT,
  LanguageProfileRepositoryPort,
} from 'src/application/ports/language-profile-repository.port';
import {
  LANGUAGE_LESSON_REPOSITORY_PORT,
  LanguageLessonRepositoryPort,
} from 'src/application/ports/language-lesson-repository.port';
import {
  LANGUAGE_EXAM_REPOSITORY_PORT,
  LanguageExamRepositoryPort,
} from 'src/application/ports/language-exam-repository.port';
import {
  ADVENTURE_GENERATION_REPOSITORY_PORT,
  AdventureGenerationRepositoryPort,
} from 'src/application/ports/adventure-generation-repository.port';
import {
  HIDDEN_LEVEL_REPOSITORY_PORT,
  HiddenLevelRepositoryPort,
} from 'src/application/ports/hidden-level-repository.port';

interface JwtUser { sub: string; email: string; role: string; }

@Controller('languages/adventure')
@UseGuards(ApiKeyGuard, JwtAuthGuard)
export class LanguageAdventureController {
  constructor(
    @Inject(LANGUAGE_PROFILE_REPOSITORY_PORT)
    private readonly profileService: LanguageProfileRepositoryPort,
    @Inject(LANGUAGE_LESSON_REPOSITORY_PORT)
    private readonly lessonService: LanguageLessonRepositoryPort,
    @Inject(LANGUAGE_EXAM_REPOSITORY_PORT)
    private readonly examService: LanguageExamRepositoryPort,
    @Inject(ADVENTURE_GENERATION_REPOSITORY_PORT)
    private readonly generationService: AdventureGenerationRepositoryPort,
    @Inject(HIDDEN_LEVEL_REPOSITORY_PORT)
    private readonly hiddenLevelService: HiddenLevelRepositoryPort,
  ) {}

  private user(req: Request): JwtUser {
    return (req as unknown as Record<string, JwtUser>)['jwtUser'];
  }

  @Get('current')
  async getCurrent(@Req() req: Request) {
    return this.profileService.getDashboard(this.user(req).sub);
  }

  // ── Phase generation ──────────────────────────────────────────────────────

  @Post('phases/generate')
  @HttpCode(HttpStatus.CREATED)
  async generatePhase(@Req() req: Request) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    const result = await this.generationService.generatePhase(profile.id);
    const phase = await this.generationService.getPhase(result.phaseId, profile.id);
    return { phaseId: result.phaseId, alreadyExisted: result.alreadyExisted, phase };
  }

  @Get('phases/:phaseId')
  async getPhase(@Req() req: Request, @Param('phaseId') phaseId: string) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.generationService.getPhase(phaseId, profile.id);
  }

  @Get('phases')
  async listPhases(@Req() req: Request) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.generationService.listPhases(profile.id);
  }

  // ── Lessons ───────────────────────────────────────────────────────────────

  @Post('lessons/:lessonId/start')
  @HttpCode(HttpStatus.OK)
  async startLesson(@Req() req: Request, @Param('lessonId') lessonId: string) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    await this.lessonService.startLesson(profile.id, lessonId);
    const content = await this.generationService.ensureLessonContent(lessonId);
    return { content };
  }

  @Post('lessons/:lessonId/complete')
  @HttpCode(HttpStatus.OK)
  async completeLesson(
    @Req() req: Request,
    @Param('lessonId') lessonId: string,
    @Body() body: { answers?: Record<string, unknown>; hintsUsed?: number },
  ) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.lessonService.completeLesson(profile.id, lessonId, body);
  }

  // ── Exams ─────────────────────────────────────────────────────────────────

  @Get('exams/:examId')
  async getExam(@Req() req: Request, @Param('examId') examId: string) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    await this.generationService.ensureExamQuestions(examId);
    return this.examService.getExam(profile.id, examId);
  }

  @Post('exams/:examId/attempts')
  @HttpCode(HttpStatus.OK)
  async submitExamAttempt(
    @Req() req: Request,
    @Param('examId') examId: string,
    @Body() body: { answers: Record<string, unknown> },
  ) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.examService.submitAttempt(profile.id, examId, body.answers);
  }

  // ── Hidden Levels ─────────────────────────────────────────────────────────

  @Get('hidden-levels')
  async getHiddenLevels(@Req() req: Request) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.hiddenLevelService.getHiddenLevels(profile.id);
  }

  @Post('hidden-levels/:hiddenLevelId/complete')
  @HttpCode(HttpStatus.OK)
  async completeHiddenLevel(
    @Req() req: Request,
    @Param('hiddenLevelId') hiddenLevelId: string,
  ) {
    const profile = await this.profileService.getOrCreate(this.user(req).sub);
    return this.hiddenLevelService.completeHiddenLevel(profile.id, hiddenLevelId);
  }
}
