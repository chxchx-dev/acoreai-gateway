import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';

@Injectable()
export class SttService {
  private readonly logger = new Logger(SttService.name);
  private readonly sttUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {
    this.sttUrl = this.config.get<string>('STT_SERVICE_URL', 'http://stt-service:9000');
  }

  async transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language = 'es',
  ): Promise<{ text: string; language: string }> {
    const form = new FormData();
    const arrayBuf = audioBuffer.buffer.slice(
      audioBuffer.byteOffset,
      audioBuffer.byteOffset + audioBuffer.byteLength,
    ) as ArrayBuffer;
    const blob = new Blob([arrayBuf], { type: mimeType });
    form.append('file', blob, this.filenameForMimeType(mimeType));
    form.append('language', language);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    const start = Date.now();

    try {
      const res = await fetch(`${this.sttUrl}/transcribe`, {
        method: 'POST',
        body: form,
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => String(res.status));
        throw new ServiceUnavailableException(`STT service: ${msg}`);
      }

      const data = (await res.json()) as { text: string; language: string };
      return { text: data.text ?? '', language: data.language ?? language };
    } catch (err: unknown) {
      this.observability.incrementError('stt', err instanceof Error ? err.name : 'unknown');
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`STT error: ${message}`);
      throw new ServiceUnavailableException('El servicio de transcripción no está disponible');
    } finally {
      clearTimeout(timer);
      this.observability.observeStage('stt.transcribe', Date.now() - start);
    }
  }

  private filenameForMimeType(mimeType: string): string {
    const normalized = String(mimeType || '').toLowerCase();
    if (normalized.includes('mp4') || normalized.includes('m4a')) return 'audio.m4a';
    if (normalized.includes('ogg')) return 'audio.ogg';
    if (normalized.includes('wav')) return 'audio.wav';
    if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'audio.mp3';
    if (normalized.includes('flac')) return 'audio.flac';
    return 'audio.webm';
  }
}
