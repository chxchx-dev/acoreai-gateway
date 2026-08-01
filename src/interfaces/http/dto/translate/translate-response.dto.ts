export class TranslateResponseDto {
  original!: string;
  translations!: Record<string, string>;
  model!: string;
  durationMs!: number;
}
