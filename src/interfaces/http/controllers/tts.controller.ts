import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { TtsRequestDto } from '../dto/tts/tts-request.dto';
import { AlignedTtsResult, TtsService } from 'src/modules/tts/tts.service';

@UseGuards(ApiKeyOrJwtGuard)
@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Get('voices')
  async voices(): Promise<Record<string, unknown>> {
    return this.ttsService.getVoices();
  }

  @Post()
  async synthesize(@Body() dto: TtsRequestDto, @Res() res: Response): Promise<void> {
    const audio = await this.ttsService.synthesize(
      dto.text,
      dto.voice,
      dto.speed,
    );
    res.set('Content-Type', 'audio/wav');
    res.set('Content-Length', String(audio.length));
    res.end(audio);
  }

  @Post('aligned')
  async synthesizeAligned(@Body() dto: TtsRequestDto): Promise<AlignedTtsResult> {
    return this.ttsService.synthesizeAligned(dto.text, dto.voice, dto.speed);
  }
}
