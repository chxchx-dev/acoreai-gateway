import {
  BadRequestException,
  Controller,
  Inject,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { STT_PORT, SttPort } from 'src/application/ports/stt.port';

interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@UseGuards(ApiKeyOrJwtGuard)
@Controller('stt')
export class SttController {
  constructor(
    @Inject(STT_PORT)
    private readonly sttService: SttPort,
  ) {}

  /**
   * POST /api/stt?language=es
   * multipart/form-data  →  campo "audio"  (WebM, OGG, WAV, MP3 …)
   */
  @Post()
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  async transcribe(
    @UploadedFile() file: MulterFile,
    @Query('language') language = 'es',
  ): Promise<{ text: string; language: string }> {
    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Envía el audio en multipart/form-data con el campo "audio"',
      );
    }
    return this.sttService.transcribe(file.buffer, file.mimetype, language);
  }
}
