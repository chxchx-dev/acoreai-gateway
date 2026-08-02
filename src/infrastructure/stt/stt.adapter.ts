import { Injectable } from '@nestjs/common';
import { SttService } from 'src/modules/stt/stt.service';
import { SttPort } from 'src/application/ports/stt.port';

@Injectable()
export class SttAdapter implements SttPort {
  constructor(private readonly sttService: SttService) {}

  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language?: string,
  ): Promise<{ text: string; language: string }> {
    return this.sttService.transcribe(audioBuffer, mimeType, language);
  }
}
