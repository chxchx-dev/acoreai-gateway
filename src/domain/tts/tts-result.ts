export interface TtsWordBoundary {
  offsetMs: number;
  durationMs: number;
  text: string;
}

export interface AlignedTtsResult {
  audioBase64: string;
  contentType: string;
  text: string;
  boundaries: TtsWordBoundary[];
}
