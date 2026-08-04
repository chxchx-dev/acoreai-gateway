import { Controller, Get, Post, Patch, Body, Inject, UseGuards, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ApiKeyGuard } from '../guards/api-key.guard';
import {
  LANGUAGE_PROFILE_REPOSITORY_PORT,
  LanguageProfileRepositoryPort,
} from 'src/application/ports/language-profile-repository.port';
import { LanguageCode } from '@prisma/client';

interface JwtUser { sub: string; email: string; role: string; }

@Controller('languages')
@UseGuards(ApiKeyGuard, JwtAuthGuard)
export class LanguageProfileController {
  constructor(
    @Inject(LANGUAGE_PROFILE_REPOSITORY_PORT)
    private readonly profileService: LanguageProfileRepositoryPort,
  ) {}

  @Get('me')
  async getProfile(@Req() req: Request) {
    const user = (req as unknown as Record<string, JwtUser>)['jwtUser'];
    const dashboard = await this.profileService.getDashboard(user.sub);
    if (dashboard) return dashboard;
    await this.profileService.getOrCreate(user.sub);
    return this.profileService.getDashboard(user.sub);
  }

  @Post('profiles')
  @HttpCode(HttpStatus.CREATED)
  async createProfile(@Req() req: Request, @Body() body: { languageCode?: string }) {
    const user = (req as unknown as Record<string, JwtUser>)['jwtUser'];
    const code = (body.languageCode as LanguageCode) ?? LanguageCode.EN;
    return this.profileService.getOrCreate(user.sub, code);
  }

  @Get('titles')
  async getTitles() {
    return this.profileService.getAvailableTitles();
  }

  @Patch('titles/select')
  async selectTitle(@Req() req: Request, @Body() body: { titleId: string }) {
    const user = (req as unknown as Record<string, JwtUser>)['jwtUser'];
    const profile = await this.profileService.getOrCreate(user.sub);
    await this.profileService.selectTitle(profile.id, body.titleId);
    return { success: true };
  }

  @Get('topics/me')
  async getTopicMemory(@Req() req: Request) {
    const user = (req as unknown as Record<string, JwtUser>)['jwtUser'];
    const profile = await this.profileService.getOrCreate(user.sub);
    return profile.topicMemory ?? [];
  }
}
