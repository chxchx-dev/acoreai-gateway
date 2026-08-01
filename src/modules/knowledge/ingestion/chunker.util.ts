export interface TextChunk {
  chunkIndex: number;
  sectionTitle: string | null;
  content: string;
  tokensCount: number;
}

// Aproximación simple sin tokenizer real: ~4 caracteres por token en español.
const CHARS_PER_TOKEN = 4;
const CHUNK_SIZE_TOKENS = 700;
const OVERLAP_TOKENS = 120;
const CHUNK_SIZE_CHARS = CHUNK_SIZE_TOKENS * CHARS_PER_TOKEN;
const OVERLAP_CHARS = OVERLAP_TOKENS * CHARS_PER_TOKEN;

function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / CHARS_PER_TOKEN));
}

interface Block {
  text: string;
  isHeading: boolean;
}

function splitIntoBlocks(text: string): Block[] {
  return text
    .split(/\n{2,}/)
    .map((raw) => raw.trim())
    .filter((raw) => raw.length > 0)
    .map((raw) => ({
      text: raw,
      isHeading: /^#{1,6}\s+/.test(raw),
    }));
}

// Chunking consciente de encabezados markdown: no mezcla secciones si tienen
// título propio, y mantiene el título de sección repetido en cada chunk.
export function chunkKnowledgeText(text: string): TextChunk[] {
  const blocks = splitIntoBlocks(text);
  const chunks: TextChunk[] = [];

  let buffer = '';
  let bufferSection: string | null = null;

  const pushBuffer = () => {
    const trimmed = buffer.trim();
    if (trimmed.length === 0) return;
    chunks.push({
      chunkIndex: chunks.length,
      sectionTitle: bufferSection,
      content: trimmed,
      tokensCount: estimateTokens(trimmed),
    });
  };

  for (const block of blocks) {
    if (block.isHeading) {
      if (buffer.length + block.text.length > CHUNK_SIZE_CHARS && buffer.length > 0) {
        pushBuffer();
        buffer = '';
      }
      bufferSection = block.text.replace(/^#{1,6}\s+/, '');
      buffer += (buffer ? '\n\n' : '') + block.text;
      continue;
    }

    if (buffer.length + block.text.length > CHUNK_SIZE_CHARS && buffer.length > 0) {
      pushBuffer();
      buffer = buffer.slice(-OVERLAP_CHARS);
    }

    buffer += (buffer ? '\n\n' : '') + block.text;
  }

  pushBuffer();

  return chunks;
}
