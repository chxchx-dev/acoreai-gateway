import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
// turndown usa `export =` (CJS puro, sin __esModule); con esModuleInterop
// deshabilitado en este proyecto, un `import default` normal rompe en runtime
// ("turndown_1.default is not a constructor"). `import ... = require(...)` es
// la forma correcta para este tipo de módulo.
import TurndownService = require('turndown');
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ParsedDocument {
  markdown: string;
  suggestedTitle: string | null;
  warnings: string[];
}

const MAX_URL_BYTES = 15 * 1024 * 1024; // 15 MB, evita URLs que sirvan binarios enormes por error

// Instancia compartida: DOCX y URL llegan como HTML real (con encabezados/listas
// semánticos), así que turndown puede convertirlos a Markdown fielmente. PDF no
// pasa por acá porque no tiene HTML — ver parsePdfToMarkdown.
const turndown = new TurndownService({
  headingStyle: 'atx', // "# Título" en vez de "Título\n===="
  bulletListMarker: '-',
  codeBlockStyle: 'fenced',
});

function collapseBlankLines(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n') // espacios colgantes al final de línea
    .replace(/\n{3,}/g, '\n\n') // nunca más de 1 línea en blanco entre bloques
    .trim();
}

// ── PDF ──────────────────────────────────────────────────────────────────
// pdf-parse extrae texto plano por página, sin estructura semántica (un PDF no
// sabe qué es un "encabezado", solo tiene texto posicionado). Por eso esto es
// heurístico y best-effort: no reconstruye Markdown perfecto, solo evita que
// el texto quede en un bloque gigante ilegible para el chunker.
function markdownFromPdfPages(pages: { num: number; text: string }[]): string {
  const HEADING_MAX_CHARS = 80;

  return pages
    .map((page) => {
      const lines = page.text
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);

      const rebuilt = lines
        .map((line) => {
          // Heurística: línea corta, sin punto final y en mayúsculas/título ⇒
          // probablemente es un encabezado en el PDF original, no un párrafo.
          const looksLikeHeading = line.length <= HEADING_MAX_CHARS && !/[.,;:]$/.test(line) && /^[A-ZÁÉÍÓÚÑ0-9]/.test(line);
          return looksLikeHeading ? `\n## ${line}\n` : line;
        })
        .join('\n');

      return rebuilt;
    })
    .join('\n\n');
}

export async function parsePdfToMarkdown(buffer: Buffer): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    const rawMarkdown = markdownFromPdfPages(result.pages);
    const markdown = collapseBlankLines(rawMarkdown);

    if (markdown.length === 0) {
      warnings.push('pdf_sin_texto_extraible');
    }
    warnings.push('pdf_estructura_heuristica'); // avisa siempre: los encabezados son una suposición, hay que revisarlos a mano

    const suggestedTitle = result.pages[0]?.text.split('\n').find((l) => l.trim().length > 0)?.trim() ?? null;

    return { markdown, suggestedTitle, warnings };
  } finally {
    await parser.destroy();
  }
}

// ── DOCX ─────────────────────────────────────────────────────────────────
// mammoth entiende el formato real de Word (estilos "Heading 1", listas,
// negritas) y lo traduce a HTML semántico; turndown convierte ESE HTML a MD.
// A diferencia del PDF, acá la estructura no es adivinada: es la que el
// documento realmente declara.
export async function parseDocxToMarkdown(buffer: Buffer): Promise<ParsedDocument> {
  const warnings: string[] = [];
  const { value: html, messages } = await mammoth.convertToHtml({ buffer });

  if (messages.some((m) => m.type === 'warning')) {
    warnings.push('docx_estilos_no_reconocidos'); // ej. estilos custom que mammoth no mapeó 1:1
  }

  const markdown = collapseBlankLines(turndown.turndown(html));
  if (markdown.length === 0) {
    warnings.push('docx_sin_texto_extraible');
  }

  const titleMatch = /^#{1,2}\s+(.+)$/m.exec(markdown);
  return { markdown, suggestedTitle: titleMatch?.[1]?.trim() ?? null, warnings };
}

// ── URL ──────────────────────────────────────────────────────────────────
// Readability es el mismo motor del "modo lectura" de Firefox: separa el
// artículo real (texto útil) de menús/publicidad/sidebars antes de convertir
// a Markdown. Sin esto, una página normal ensucia el RAG con navegación.
export async function parseUrlToMarkdown(url: string): Promise<ParsedDocument> {
  const warnings: string[] = [];

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error('La URL no es válida');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw new Error('Solo se aceptan URLs http/https');
  }

  const res = await fetch(parsedUrl, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error(`No se pudo descargar la URL (HTTP ${res.status})`);
  }
  const contentLength = Number(res.headers.get('content-length') ?? 0);
  if (contentLength > MAX_URL_BYTES) {
    throw new Error('La página supera el tamaño máximo permitido (15 MB)');
  }

  const html = await res.text();
  const dom = new JSDOM(html, { url: parsedUrl.toString() });
  const article = new Readability(dom.window.document).parse();

  if (!article?.content) {
    warnings.push('url_no_se_pudo_extraer_articulo');
    return { markdown: '', suggestedTitle: null, warnings };
  }

  const markdown = collapseBlankLines(turndown.turndown(article.content));
  if (markdown.length === 0) {
    warnings.push('url_sin_texto_extraible');
  }

  return { markdown, suggestedTitle: article.title ?? null, warnings };
}
