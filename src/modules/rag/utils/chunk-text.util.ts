export function chunkText(text: string, maxChars: number): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = '';

  for (const paragraph of paragraphs) {
    const trimmed = paragraph.trim();
    if (!trimmed) continue;

    if (current.length + trimmed.length + 2 <= maxChars) {
      current = current ? `${current}\n\n${trimmed}` : trimmed;
    } else {
      if (current) chunks.push(current);

      if (trimmed.length <= maxChars) {
        current = trimmed;
      } else {
        // Párrafo demasiado largo: dividir por oraciones
        const sentences = trimmed.match(/[^.!?]+[.!?]+/g) ?? [trimmed];
        current = '';
        for (const sentence of sentences) {
          const s = sentence.trim();
          if (!s) continue;
          if (current.length + s.length + 1 <= maxChars) {
            current = current ? `${current} ${s}` : s;
          } else {
            if (current) chunks.push(current);
            current = s.slice(0, maxChars);
          }
        }
      }
    }
  }

  if (current) chunks.push(current);
  return chunks.filter((c) => c.trim().length > 0);
}
