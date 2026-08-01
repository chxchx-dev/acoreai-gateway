import { BadRequestException } from '@nestjs/common';

// Bloquea rangos privados/locales y el endpoint de metadata de nube (169.254.169.254)
// como defensa básica anti-SSRF, además del allowlist explícito de dominios.
const BLOCKED_HOSTNAME_PATTERNS: RegExp[] = [
  /^localhost$/i,
  /^127\./,
  /^0\.0\.0\.0$/,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80:/i,
];

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024; // 5 MB
const FETCH_TIMEOUT_MS = 15000;

export function assertUrlAllowed(rawUrl: string, allowedDomains: string[]): URL {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new BadRequestException('URL inválida');
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new BadRequestException('Solo se permiten URLs http/https');
  }

  if (BLOCKED_HOSTNAME_PATTERNS.some((pattern) => pattern.test(url.hostname))) {
    throw new BadRequestException('No se permite apuntar a direcciones internas/privadas');
  }

  const isAllowedDomain = allowedDomains.some(
    (domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`),
  );
  if (!isAllowedDomain) {
    throw new BadRequestException(
      `El dominio "${url.hostname}" no está autorizado. Agrégalo a KNOWLEDGE_WATCHER_ALLOWED_DOMAINS.`,
    );
  }

  return url;
}

export interface FetchedUrlContent {
  text: string;
  contentType: string;
}

export async function fetchUrlContent(url: URL): Promise<FetchedUrlContent> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), {
      signal: controller.signal,
      redirect: 'manual', // un redirect podría saltarse el allowlist; se rechaza explícitamente
      headers: { 'User-Agent': 'OlanKnowledgeWatcher/1.0' },
    });

    if (response.status >= 300 && response.status < 400) {
      throw new BadRequestException(
        'La URL respondió con una redirección. Los watchers no siguen redirects (para no saltarse el allowlist); usa la URL final.',
      );
    }
    if (!response.ok) {
      throw new BadRequestException(`La URL respondió con estado ${response.status}`);
    }

    const contentType = response.headers.get('content-type') ?? '';
    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new BadRequestException('El contenido de la URL supera el tamaño máximo permitido (5MB)');
    }

    const raw = await response.text();
    if (raw.length > MAX_RESPONSE_BYTES) {
      throw new BadRequestException('El contenido de la URL supera el tamaño máximo permitido (5MB)');
    }

    const text = contentType.includes('text/html') ? stripHtml(raw) : raw;
    return { text, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

// Extractor de HTML muy básico (no es un parser real): suficiente para el
// MVP de watchers sobre páginas de texto simple. Contenido muy dinámico
// (SPA renderizado por JS) no se resuelve correctamente.
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<\/(p|div|br|li|h[1-6]|tr)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
