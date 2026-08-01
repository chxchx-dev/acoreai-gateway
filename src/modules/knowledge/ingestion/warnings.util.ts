import type { KnowledgeChunk, KnowledgeSource, KnowledgeSourceVersion } from '@prisma/client';
import { detectSensitiveData } from './sensitive-data.util';

const MIN_CHUNK_TOKENS = 50;
const MAX_CHUNK_TOKENS = 1200;

export function computeSourceWarnings(
  source: KnowledgeSource,
  version: KnowledgeSourceVersion | null,
  chunks: Pick<KnowledgeChunk, 'tokensCount'>[],
): string[] {
  const warnings: string[] = [];

  if (!version || !version.extractedText || version.extractedText.trim().length === 0) {
    warnings.push('documento_sin_texto_extraible');
  } else if (version.extractedText.trim().length < 200) {
    warnings.push('texto_demasiado_corto');
  }

  if (version?.extractedText) {
    for (const label of detectSensitiveData(version.extractedText)) {
      warnings.push(`posible_informacion_sensible:${label}`);
    }
  }

  if (!source.validUntil) warnings.push('fecha_de_vencimiento_ausente');
  if (!source.area) warnings.push('area_sin_asignar');
  if (!source.language) warnings.push('idioma_no_detectado');

  const tooSmall = chunks.filter((c) => (c.tokensCount ?? 0) < MIN_CHUNK_TOKENS).length;
  if (tooSmall > 0) warnings.push(`chunks_demasiado_pequenos:${tooSmall}`);

  const tooBig = chunks.filter((c) => (c.tokensCount ?? 0) > MAX_CHUNK_TOKENS).length;
  if (tooBig > 0) warnings.push(`chunks_demasiado_grandes:${tooBig}`);

  return warnings;
}
