import {
  BadRequestException,
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param,
  Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { IsArray, IsInt, IsNotEmpty, IsObject, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AdminGuard } from '../guards/admin.guard';
import { DeviceLockGuard } from '../guards/device-lock.guard';
import { TranslateRequestDto } from '../dto/translate/translate-request.dto';
import { TranslationCacheQueryDto } from '../dto/translate/translation-cache-query.dto';
import { TranslateService } from 'src/modules/translate/translate.service';
import {
  TRANSLATION_SAVE_REPOSITORY_PORT,
  TranslationSaveRepositoryPort,
} from 'src/application/ports/translation-save-repository.port';
import {
  TRANSLATION_CACHE_PORT,
  TranslationCachePort,
} from 'src/application/ports/translation-cache.port';
import { JwtPayload } from 'src/modules/auth/auth.service';
import { UserRole } from 'src/domain/auth/user-role';

class SaveTranslationDto {
  @IsString() title!: string;
  @IsString() text!: string;
  @IsObject() translations!: Record<string, string>;
  @IsArray() @IsString({ each: true }) langs!: string[];
}

class ListHistoryQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

// ── DTOs para endpoints mobile (sin JWT) ────────────────────────────────────
class SaveHistoryAppDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsString() @IsNotEmpty() title!: string;
  @IsString() @IsNotEmpty() text!: string;
  @IsObject() translations!: Record<string, string>;
  @IsArray() @IsString({ each: true }) langs!: string[];
}

class ListHistoryAppQueryDto {
  @IsString() @IsNotEmpty() userId!: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(200) limit?: number;
}

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

function isAdmin(req: Request): boolean {
  return jwtUser(req).role === UserRole.ADMIN;
}

@Controller('translate')
export class TranslateController {
  constructor(
    private readonly translateService: TranslateService,
    @Inject(TRANSLATION_SAVE_REPOSITORY_PORT)
    private readonly translationSaveService: TranslationSaveRepositoryPort,
    @Inject(TRANSLATION_CACHE_PORT)
    private readonly translationCacheService: TranslationCachePort,
  ) {}

  @UseGuards(ApiKeyOrJwtGuard)
  @Post()
  translate(@Body() dto: TranslateRequestDto) {
    return this.translateService.translate(dto);
  }

  @UseGuards(ApiKeyOrJwtGuard)
  @Post('stream')
  translateStream(
    @Body() dto: TranslateRequestDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    return this.translateService.translateStream(dto, req, res);
  }

  // ── Translation history ──────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Post('history')
  saveHistory(@Body() dto: SaveTranslationDto, @Req() req: Request) {
    const userId = jwtUser(req).sub;
    return this.translationSaveService.save({ ...dto, userId });
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  listHistory(@Query() query: ListHistoryQueryDto, @Req() req: Request) {
    const user = jwtUser(req);
    const userId = isAdmin(req) ? undefined : user.sub;
    return this.translationSaveService.list(userId ?? user.sub, query.limit);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('history/:id')
  deleteHistory(@Param('id') id: string, @Req() req: Request) {
    const userId = jwtUser(req).sub;
    return this.translationSaveService.delete(id, userId);
  }

  // ── Historial mobile (solo ApiKeyGuard, userId en body/query) ────────────

  @UseGuards(ApiKeyGuard, DeviceLockGuard)
  @Post('history/app')
  saveHistoryApp(@Body() dto: SaveHistoryAppDto) {
    return this.translationSaveService.save(dto);
  }

  @UseGuards(ApiKeyGuard, DeviceLockGuard)
  @Get('history/app')
  listHistoryApp(@Query() query: ListHistoryAppQueryDto) {
    if (!query.userId) throw new BadRequestException('userId requerido');
    return this.translationSaveService.list(query.userId, query.limit ?? 50);
  }

  @UseGuards(ApiKeyGuard, DeviceLockGuard)
  @Delete('history/app/:id')
  deleteHistoryApp(@Param('id') id: string, @Query('userId') userId: string) {
    if (!userId) throw new BadRequestException('userId requerido');
    return this.translationSaveService.delete(id, userId);
  }

  // ── Administración del cache de traducciones (Mongo, uno por idioma) ─────

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('cache/stats')
  cacheStats() {
    return this.translationCacheService.stats();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('cache/languages')
  cacheLanguages() {
    return this.translationCacheService.listLanguages();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('cache')
  cacheList(@Query() query: TranslationCacheQueryDto) {
    return this.translationCacheService.list(query);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete('cache/:language/:textHash')
  @HttpCode(HttpStatus.NO_CONTENT)
  cacheRemove(@Param('language') language: string, @Param('textHash') textHash: string): Promise<void> {
    return this.translationCacheService.remove(language, textHash);
  }
}
