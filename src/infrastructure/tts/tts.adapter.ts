import { Injectable } from '@nestjs/common';
import { TtsService } from 'src/modules/tts/tts.service';
import { TtsPort } from 'src/application/ports/tts.port';
import { AlignedTtsResult } from 'src/domain/tts/tts-result';

@Injectable()
export class TtsAdapter implements TtsPort {
  constructor(private readonly ttsService: TtsService) {}

  getVoices(): Promise<Record<string, unknown>> {
    return this.ttsService.getVoices();
  }

  synthesize(text: string, voice?: string, speed?: number): Promise<Buffer> {
    return this.ttsService.synthesize(text, voice, speed);
  }

  synthesizeAligned(text: string, voice?: string, speed?: number): Promise<AlignedTtsResult> {
    return this.ttsService.synthesizeAligned(text, voice, speed);
  }
}
