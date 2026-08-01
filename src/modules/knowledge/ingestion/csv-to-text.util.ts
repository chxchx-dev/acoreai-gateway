// Parser CSV mínimo (RFC 4180: comillas, comas y saltos de línea dentro de
// campos entrecomillados, comillas escapadas como ""). No pretende cubrir
// dialectos exóticos (delimitador ; o tab) — la fuente esperada es un CSV
// exportado de Excel/Sheets/una base de datos, curado por un supervisor.
export function parseCsv(raw: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// Convierte el CSV a texto tipo Markdown: una sección "## Fila N" por
// registro, con "columna: valor" debajo. El chunker (ingestion/chunker.util.ts)
// ya sabe partir por encabezados markdown, así que cada fila termina siendo
// un chunk propio y buscable — sin tocar el pipeline de ingesta existente.
export function csvToKnowledgeText(raw: string, titleColumn?: string): string {
  const rows = parseCsv(raw);
  if (rows.length === 0) return '';

  const [header, ...dataRows] = rows;
  const blocks = dataRows.map((row, index) => {
    const titleIdx = titleColumn ? header.findIndex((h) => h.trim() === titleColumn) : -1;
    const title = titleIdx >= 0 && row[titleIdx] ? row[titleIdx].trim() : `Fila ${index + 1}`;

    const fields = header
      .map((col, i) => `${col.trim()}: ${(row[i] ?? '').trim()}`)
      .filter((line) => !line.endsWith(': '))
      .join('\n');

    return `## ${title}\n\n${fields}`;
  });

  return blocks.join('\n\n');
}
