import { Body, Controller, Get, Inject, Post, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { TtsRequestDto } from '../dto/tts/tts-request.dto';
import { AlignedTtsResult } from 'src/domain/tts/tts-result';
import { TTS_PORT, TtsPort } from 'src/application/ports/tts.port';

@UseGuards(ApiKeyOrJwtGuard)
@Controller('tts')
export class TtsController {
  constructor(
    @Inject(TTS_PORT)
    private readonly ttsService: TtsPort,
  ) {}

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
