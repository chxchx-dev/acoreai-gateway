import { AlignedTtsResult } from 'src/domain/tts/tts-result';

export const TTS_PORT = Symbol('TTS_PORT');

export interface TtsPort {
  getVoices(): Promise<Record<string, unknown>>;
  synthesize(text: string, voice?: string, speed?: number): Promise<Buffer>;
  synthesizeAligned(text: string, voice?: string, speed?: number): Promise<AlignedTtsResult>;
}
