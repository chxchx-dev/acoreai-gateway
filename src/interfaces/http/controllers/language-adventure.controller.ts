import {
  Controller, Get, Post, Body, Param, UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { LanguageProfileService } from 'src/modules/languages/application/services/language-profile.service';
import { LanguageLessonService } from 'src/modules/languages/application/services/language-lesson.service';
import { LanguageExamService } from 'src/modules/languages/application/services/language-exam.service';
import { AdventureGenerationService } from 'src/modules/languages/application/services/adventure-generation.service';
import { HiddenLevelService } from 'src/modules/languages/application/services/hidden-level.service';

interface JwtUser { sub: string; email: string; role: string; }

@Controller('languages/adventure')
@UseGuards(ApiKeyGuard, JwtAuthGuard)
export class LanguageAdventureController {
  constructor(
    private readonly profileService: LanguageProfileService,
    private readonly lessonService: LanguageLessonService,
    private readonly examService: LanguageExamService,
    private readonly generationService: AdventureGenerationService,
    private readonly hiddenLevelService: HiddenLevelService,
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
