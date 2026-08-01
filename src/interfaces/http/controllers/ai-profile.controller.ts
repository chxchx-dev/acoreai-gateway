import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AiProfileService } from 'src/modules/ai-profile/ai-profile.service';
import { UpsertAiProfileDto } from '../dto/ai-profile/upsert-ai-profile.dto';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@UseGuards(JwtAuthGuard)
@Controller('ai/profile')
export class AiProfileController {
  constructor(private readonly aiProfileService: AiProfileService) {}

  /** GET /api/ai/profile — obtiene el perfil del usuario autenticado */
  @Get()
  async getProfile(@Req() req: Request) {
    const userId = jwtUser(req).sub;
    const profile = await this.aiProfileService.getProfile(userId);
    if (!profile) throw new NotFoundException('Perfil IA no configurado');
    return profile;
  }

  /** POST /api/ai/profile — crea o actualiza el perfil (onboarding) */
  @Post()
  upsertProfile(@Body() dto: UpsertAiProfileDto, @Req() req: Request) {
    const userId = jwtUser(req).sub;
    return this.aiProfileService.upsertProfile({ ...dto, userId });
  }

  /** PUT /api/ai/profile — edita el perfil existente */
  @Put()
  updateProfile(@Body() dto: UpsertAiProfileDto, @Req() req: Request) {
    const userId = jwtUser(req).sub;
    return this.aiProfileService.upsertProfile({ ...dto, userId });
  }
}
