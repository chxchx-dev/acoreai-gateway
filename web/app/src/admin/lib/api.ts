import { clearSession, getToken } from '../../lib/auth';

// Vite proxies /ai during development; the production nginx serves the
// gateway under /api alongside the user application.
const BASE_URL = import.meta.env.DEV ? '/ai/api' : '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = new Headers(options.headers);
  const isFormData = options.body instanceof FormData;
  if (!isFormData && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearSession();
    window.location.href = '/login';
    throw new ApiError(401, 'Sesión expirada');
  }

  const contentType = res.headers.get('content-type') ?? '';
  const data = contentType.includes('application/json') ? await res.json().catch(() => null) : null;

  if (!res.ok) {
    const message = (data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : null) ?? `Error ${res.status}`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: body !== undefined ? JSON.stringify(body) : undefined }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: body !== undefined ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  upload: <T>(path: string, formData: FormData) => {
    const token = getToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);
    return request<T>(path, { method: 'POST', body: formData, headers });
  },
  // Para descargas de archivos (CSV/Excel): dispara el guardado del navegador
  // en vez de devolver JSON. Requiere Authorization, por eso no es un <a href>.
  download: async (path: string, filenameFallback: string) => {
    const token = getToken();
    const headers = new Headers();
    if (token) headers.set('Authorization', `Bearer ${token}`);

    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) {
      const data = await res.json().catch(() => null);
      const message = (data && typeof data === 'object' && 'message' in data ? String((data as { message: unknown }).message) : null) ?? `Error ${res.status}`;
      throw new ApiError(res.status, message, data);
    }

    const disposition = res.headers.get('content-disposition') ?? '';
    const match = /filename="?([^"]+)"?/.exec(disposition);
    const filename = match?.[1] ?? filenameFallback;

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },
};

function buildQuery(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

export { buildQuery };
