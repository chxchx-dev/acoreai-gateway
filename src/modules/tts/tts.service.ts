import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';

export type TtsWordBoundary = {
  offsetMs: number;
  durationMs: number;
  text: string;
};

export type AlignedTtsResult = {
  audioBase64: string;
  contentType: string;
  text: string;
  boundaries: TtsWordBoundary[];
};

@Injectable()
export class TtsService {
  private readonly logger = new Logger(TtsService.name);
  private readonly ttsUrl: string;

  constructor(
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {
    this.ttsUrl = this.config.get<string>('TTS_SERVICE_URL', 'http://tts-service:8880');
  }

  async getVoices(): Promise<Record<string, unknown>> {
    const start = Date.now();
    try {
      const res = await fetch(`${this.ttsUrl}/voices`);
      if (!res.ok) throw new Error(`TTS voices: ${res.status}`);
      return res.json() as Promise<Record<string, unknown>>;
    } catch (err: unknown) {
      this.observability.incrementError('tts', err instanceof Error ? err.name : 'unknown');
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`TTS voices error: ${message}`);
      throw new ServiceUnavailableException('El servicio de voz no está disponible');
    } finally {
      this.observability.observeStage('tts.voices', Date.now() - start);
    }
  }

  async synthesize(text: string, voice = 'edge:es-PE-CamilaNeural', speed = 1.0): Promise<Buffer> {
    if (!this.hasSpeakableText(text)) {
      throw new BadRequestException('El texto para TTS no puede estar vacío');
    }

    const controller = new AbortController();
    // 5 min: primer request incluye descarga del modelo (~300 MB)
    const timer = setTimeout(() => controller.abort(), 300_000);
    const start = Date.now();

    try {
      const res = await fetch(`${this.ttsUrl}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => String(res.status));
        if (msg.includes('Texto vacío tras limpiar markdown')) {
          throw new BadRequestException('El texto para TTS no puede estar vacío');
        }
        throw new ServiceUnavailableException(`TTS service: ${msg}`);
      }

      const arrayBuffer = await res.arrayBuffer();
      return Buffer.from(arrayBuffer);
    } catch (err: unknown) {
      this.observability.incrementError('tts', err instanceof Error ? err.name : 'unknown');
      if (err instanceof ServiceUnavailableException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`TTS error: ${message}`);
      throw new ServiceUnavailableException('El servicio de voz no está disponible');
    } finally {
      clearTimeout(timer);
      this.observability.observeStage('tts.synthesize', Date.now() - start);
    }
  }

  async synthesizeAligned(
    text: string,
    voice = 'edge:es-PE-CamilaNeural',
    speed = 1.0,
  ): Promise<AlignedTtsResult> {
    if (!this.hasSpeakableText(text)) {
      throw new BadRequestException('El texto para TTS no puede estar vacío');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 300_000);
    const start = Date.now();

    try {
      const res = await fetch(`${this.ttsUrl}/tts/aligned`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice, speed }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const msg = await res.text().catch(() => String(res.status));
        if (msg.includes('Texto vacío tras limpiar markdown')) {
          throw new BadRequestException('El texto para TTS no puede estar vacío');
        }
        throw new ServiceUnavailableException(`TTS service: ${msg}`);
      }

      return (await res.json()) as AlignedTtsResult;
    } catch (err: unknown) {
      this.observability.incrementError('tts', err instanceof Error ? err.name : 'unknown');
      if (err instanceof ServiceUnavailableException || err instanceof BadRequestException) throw err;
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`TTS aligned error: ${message}`);
      throw new ServiceUnavailableException('El servicio de voz no está disponible');
    } finally {
      clearTimeout(timer);
      this.observability.observeStage('tts.synthesizeAligned', Date.now() - start);
    }
  }

  private hasSpeakableText(text: string): boolean {
    return String(text ?? '')
      .replace(/^\s*#{1,6}\s*/gm, '')
      .replace(/(\*\*|__)(.*?)\1/g, '$2')
      .replace(/(\*|_)(.*?)\1/g, '$2')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/^>\s+/gm, '')
      .replace(/_{2,}|-{2,}|\*{2,}/g, '')
      .trim()
      .length > 0;
  }
}
