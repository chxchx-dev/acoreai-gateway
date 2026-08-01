export interface ExtractedText {
  text: string;
  pagesDetected: number | null;
  characters: number;
  warnings: string[];
}

const MIN_TEXT_LENGTH = 200;

// Alcance actual: TXT / MD / texto manual. El contenido ya llega como texto plano,
// así que "extraer" es normalizar saltos de línea y detectar casos vacíos.
export function extractPlainText(raw: string): ExtractedText {
  const warnings: string[] = [];
  const text = raw.replace(/\r\n/g, '\n').trim();

  if (text.length === 0) {
    warnings.push('documento_sin_texto_extraible');
  } else if (text.length < MIN_TEXT_LENGTH) {
    warnings.push('texto_demasiado_corto');
  }

  return {
    text,
    pagesDetected: null,
    characters: text.length,
    warnings,
  };
}
