export const STT_PORT = Symbol('STT_PORT');

export interface SttPort {
  transcribe(
    audioBuffer: Buffer,
    mimeType: string,
    language?: string,
  ): Promise<{ text: string; language: string }>;
}
