import { clearStoredUser, readStoredUser, storeUser } from './auth';
import { safeRandomUUID } from './uuid';

export type ChatStatus = 'answered' | 'no_context' | 'error';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
  status?: string;
};

export type Conversation = {
  id: string;
  title: string;
  updatedAt?: string;
  createdAt?: string;
  source?: string;
};

export type ChatRequest = {
  question: string;
  model: string;
  userId: string;
  authToken?: string;
  conversationId?: string | null;
  system?: string;
  mode?: 'chat' | 'voice' | 'practice';
  practiceLevel?: string;
};

export type StreamResult = {
  answer: string;
  conversationId?: string;
  status: ChatStatus;
};

function cleanUrl(value?: string) {
  return String(value || '').replace(/\/+$/, '');
}

function resolveDevGatewayUrl() {
  return (
    cleanUrl(import.meta.env.VITE_AI_GATEWAY_LOCAL_URL) ||
    cleanUrl(import.meta.env.VITE_AI_GATEWAY_URL) ||
    'http://localhost:4005'
  );
}

const apiBase = import.meta.env.DEV ? '/ai' : '';

const gatewayJsonHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

function authHeaders(token?: string): Record<string, string> {
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function jsonHeaders(token?: string): Record<string, string> {
  return {
    ...gatewayJsonHeaders,
    ...authHeaders(token),
  };
}

function audioFilenameFromType(type?: string) {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('mp4') || normalized.includes('m4a')) return 'recording.m4a';
  if (normalized.includes('ogg')) return 'recording.ogg';
  if (normalized.includes('wav')) return 'recording.wav';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return 'recording.mp3';
  return 'recording.webm';
}

export class ApiError extends Error {
  constructor(message: string, public readonly status: number, public readonly body?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(res: Response) {
  const text = await res.text().catch(() => '');
  let message = `AI Gateway respondio ${res.status}`;
  let body: unknown;
  if (text) {
    try {
      body = JSON.parse(text);
      const parsed = body as { message?: unknown; error?: unknown };
      const msg = parsed.message ?? parsed.error;
      if (Array.isArray(msg)) message = msg.join(', ');
      else if (msg) message = String(msg);
    } catch {
      message = text;
    }
  }
  return new ApiError(message, res.status, body);
}

function parseSseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  const lines = raw.split('\n');
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const dataText = lines
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trimStart())
    .join('\n');

  if (!event || !dataText) return null;
  try {
    return { event, data: JSON.parse(dataText) as Record<string, unknown> };
  } catch {
    return null;
  }
}

const STREAM_TOKEN_DELAY_MS = 24;

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  if (ms <= 0 || signal?.aborted) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

function splitTokenForDisplay(token: string): string[] {
  return token.match(/\s+|[^\s]+/g) ?? [];
}

async function emitTokenWithDelay(
  token: string,
  onPart: (part: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const parts = splitTokenForDisplay(token);
  for (const part of parts) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    onPart(part);
    await sleep(STREAM_TOKEN_DELAY_MS, signal);
  }
}

export async function streamChat(
  payload: ChatRequest,
  onToken: (token: string) => void,
  signal?: AbortSignal,
): Promise<StreamResult> {
  const res = await authenticatedFetch(`${apiBase}/api/chat/stream`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({
      question: payload.question,
      model: payload.model,
      userId: payload.userId,
      conversationId: payload.conversationId || undefined,
      source: payload.mode === 'practice'
        ? `acoreai-practice-${payload.practiceLevel ?? 'Principiante'}`
        : payload.mode === 'voice'
          ? 'acoreai-voice'
          : 'acoreai-web',
      useRag: false,
      useHistory: true,
      historyLimit: 12,
      system: payload.system,
      mode: payload.mode,
      practiceLevel: payload.practiceLevel,
      keepAlive: '10m',
      options: { temperature: 0.85, num_ctx: 4096 },
    }),
    signal,
  }, payload.authToken);

  if (!res.ok || !res.body) throw await parseError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';
  let conversationId: string | undefined;
  let status: ChatStatus = 'answered';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const parsed = parseSseEvent(raw);
      if (!parsed) continue;

      if (parsed.event === 'token') {
        const token = String(parsed.data.token ?? '');
        answer += token;
        await emitTokenWithDelay(token, onToken, signal);
      }

      if (parsed.event === 'done') {
        const finalAnswer = String(parsed.data.answer ?? answer);
        answer = finalAnswer;
        conversationId = String(parsed.data.conversationId ?? parsed.data.id ?? '') || conversationId;
        status = (parsed.data.status as ChatStatus) || status;
      }

      if (parsed.event === 'error') {
        throw new Error(String(parsed.data.message ?? 'Error en el stream de ACoreAI'));
      }
    }
  }

  return { answer, conversationId, status };
}

export type RagChatRequest = {
  message: string;
  area?: string;
  language?: string;
  model?: string;
  authToken?: string;
};

export type RagSource = { title: string; page: number | null; section: string | null; score: number };

export type RagChatResult = {
  answer: string;
  sources: RagSource[];
  usedKnowledge: boolean;
};

// Chat contra el Centro de Conocimiento (RAG supervisado): solo responde con
// fuentes publicadas y aprobadas. A diferencia de streamChat, no hace streaming
// token-a-token — el backend arma la respuesta completa antes de devolverla.
export async function askRag(payload: RagChatRequest): Promise<RagChatResult> {
  const res = await authenticatedFetch(`${apiBase}/api/chat/rag`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({
      message: payload.message,
      area: payload.area || undefined,
      language: payload.language || undefined,
      model: payload.model || undefined,
    }),
  }, payload.authToken);

  if (!res.ok) throw await parseError(res);
  return res.json();
}

export async function listConversations(
  userId: string,
  authToken?: string,
): Promise<Conversation[]> {
  const res = await authenticatedFetch(
    `${apiBase}/api/conversations?userId=${encodeURIComponent(userId)}&status=active&limit=50`,
    {},
    authToken,
  );
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return items.map((item: Record<string, unknown>) => ({
    id: String(item.id),
    title: String(item.title || item.name || 'Conversacion sin titulo'),
    updatedAt: String(item.updatedAt || item.updated_at || item.createdAt || ''),
    createdAt: String(item.createdAt || ''),
    source: item.source ? String(item.source) : undefined,
  }));
}

export async function getConversationMessages(
  conversationId: string,
  userId: string,
  authToken?: string,
): Promise<ChatMessage[]> {
  const res = await authenticatedFetch(
    `${apiBase}/api/conversations/${encodeURIComponent(conversationId)}/messages?userId=${encodeURIComponent(userId)}&limit=200`,
    {},
    authToken,
  );
  if (!res.ok) throw await parseError(res);
  const data = await res.json();

  // Soporta múltiples formatos: { items }, { messages }, { data }, o array directo
  const raw = data.items ?? data.messages ?? data.data ?? (Array.isArray(data) ? data : []);
  const items: Record<string, unknown>[] = Array.isArray(raw) ? raw : [];

  return items
    .map((item) => ({
      id: String(item.id || safeRandomUUID()),
      role: (item.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: String(item.content ?? item.text ?? item.message ?? ''),
      createdAt: String(item.createdAt || item.created_at || item.timestamp || ''),
      status: String(item.status || ''),
    }))
    .filter((m) => m.content.trim() !== ''); // descartar mensajes vacíos
}

export async function deleteConversation(
  conversationId: string,
  userId: string,
  authToken?: string,
) {
  const res = await authenticatedFetch(
    `${apiBase}/api/conversations/${encodeURIComponent(conversationId)}?userId=${encodeURIComponent(userId)}`,
    { method: 'DELETE' },
    authToken,
  );
  if (!res.ok) throw await parseError(res);
}

export async function translateText(
  text: string,
  languages: string[],
  model?: string,
  authToken?: string,
) {
  const res = await authenticatedFetch(`${apiBase}/api/translate`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({ text, languages }),
  }, authToken);
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { translations: Record<string, string> };
}

export async function translateTextStream(
  text: string,
  languages: string[],
  model: string | undefined,
  onToken: (language: string, token: string) => void,
  onLanguageDone?: (language: string, translation: string) => void,
  signal?: AbortSignal,
  authToken?: string,
): Promise<Record<string, string>> {
  const res = await authenticatedFetch(`${apiBase}/api/translate/stream`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({ text, languages }),
    signal,
  }, authToken);
  if (!res.ok || !res.body) throw await parseError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const translations: Record<string, string> = {};
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const parsed = parseSseEvent(raw);
      if (!parsed) continue;

      if (parsed.event === 'token') {
        const language = String(parsed.data.lang ?? parsed.data.language ?? '');
        const token = String(parsed.data.token ?? '');
        if (!language || !token) continue;
        translations[language] = `${translations[language] || ''}${token}`;
        await emitTokenWithDelay(token, (part) => onToken(language, part), signal);
      }

      if (parsed.event === 'lang_done' || parsed.event === 'language_done') {
        const language = String(parsed.data.lang ?? parsed.data.language ?? '');
        const translation = String(parsed.data.translation ?? translations[language] ?? '');
        if (!language) continue;
        translations[language] = translation;
        onLanguageDone?.(language, translation);
      }

      if (parsed.event === 'done') {
        const finalTranslations = parsed.data.translations;
        if (finalTranslations && typeof finalTranslations === 'object') {
          Object.assign(translations, finalTranslations as Record<string, string>);
        }
      }

      if (parsed.event === 'error') {
        throw new Error(String(parsed.data.message ?? 'Error en el stream de traduccion'));
      }
    }
  }

  return translations;
}

export async function fetchHealth() {
  const res = await fetch(`${apiBase}/health/ready`);
  if (!res.ok) throw await parseError(res);
  return (await res.json()) as { status: string; service: string; timestamp: string };
}

const DEVICE_ID_KEY = 'acoreai-web:device-id';

function getOrCreateDeviceId(): string {
  const stored = window.localStorage.getItem(DEVICE_ID_KEY);
  if (stored) return stored;

  const generated = safeRandomUUID();
  window.localStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

export async function loginUser(
  email: string,
  password: string,
  opts?: { force?: boolean },
): Promise<{ token: string; refreshToken: string; user: { id: string; email: string; name: string; role: string; knowledgeRole?: string | null } }> {
  const res = await fetch(`${apiBase}/api/auth/login`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({
      email,
      password,
      deviceId: getOrCreateDeviceId(),
      platform: 'web',
      force: opts?.force,
    }),
  });
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<{
    token: string;
    refreshToken: string;
    user: { id: string; email: string; name: string; role: string };
  }>;
}

let refreshPromise: Promise<string | null> | null = null;

function getCurrentAccessToken(explicitToken?: string): string | undefined {
  const stored = readStoredUser();
  return stored?.token || explicitToken;
}

function dispatchSessionExpired() {
  clearStoredUser();
  window.dispatchEvent(new CustomEvent('acoreai:session-expired'));
}

async function refreshStoredSession(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const stored = readStoredUser();
    if (!stored?.refreshToken) {
      dispatchSessionExpired();
      return null;
    }

    const res = await fetch(`${apiBase}/api/auth/refresh`, {
      method: 'POST',
      headers: gatewayJsonHeaders,
      body: JSON.stringify({ refreshToken: stored.refreshToken }),
    });

    if (!res.ok) {
      dispatchSessionExpired();
      return null;
    }

    const payload = await res.json() as {
      token: string;
      refreshToken: string;
    };

    const updated = {
      ...stored,
      token: payload.token,
      refreshToken: payload.refreshToken,
    };
    storeUser(updated);
    return updated.token;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function authenticatedFetch(
  input: RequestInfo | URL,
  init: RequestInit = {},
  explicitToken?: string,
): Promise<Response> {
  const token = getCurrentAccessToken(explicitToken);
  const headers = new Headers(init.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let res = await fetch(input, { ...init, headers });
  if (res.status !== 401) return res;

  const refreshedToken = await refreshStoredSession();
  if (!refreshedToken) return res;

  const retryHeaders = new Headers(init.headers ?? {});
  retryHeaders.set('Authorization', `Bearer ${refreshedToken}`);
  res = await fetch(input, { ...init, headers: retryHeaders });
  return res;
}

export async function transcribeAudio(
  audioBlob: Blob,
  language = 'es',
  signal?: AbortSignal,
): Promise<string> {
  const form = new FormData();
  form.append('audio', audioBlob, audioFilenameFromType(audioBlob.type));
  const res = await fetch(`${apiBase}/api/stt?language=${encodeURIComponent(language)}`, {
    method: 'POST',
    body: form,
    signal,
  });
  if (!res.ok) throw await parseError(res);
  const data = (await res.json()) as { text: string };
  return data.text ?? '';
}

export async function listConversationsBySourcePrefix(
  userId: string,
  sourcePrefix: string,
  authToken?: string,
): Promise<Conversation[]> {
  const res = await authenticatedFetch(
    `${apiBase}/api/conversations?userId=${encodeURIComponent(userId)}&sourcePrefix=${encodeURIComponent(sourcePrefix)}&status=active&limit=50`,
    {},
    authToken,
  );
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  const items = Array.isArray(data.items) ? data.items : Array.isArray(data) ? data : [];
  return items.map((item: Record<string, unknown>) => ({
    id: String(item.id),
    title: String(item.title || item.name || 'Práctica'),
    updatedAt: String(item.updatedAt || item.updated_at || item.createdAt || ''),
    createdAt: String(item.createdAt || ''),
    source: String(item.source || ''),
  }));
}

export type SavedTranslation = {
  id: string;
  title: string;
  text: string;
  translations: Record<string, string>;
  langs: string[];
  createdAt: string;
};

export async function listTranslationHistory(
  userId: string,
  authToken?: string,
): Promise<SavedTranslation[]> {
  const res = await authenticatedFetch(
    `${apiBase}/api/translate/history`,
    {},
    authToken,
  );
  if (!res.ok) throw await parseError(res);
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

export async function saveTranslationToServer(
  payload: { title: string; text: string; translations: Record<string, string>; langs: string[] },
  authToken?: string,
): Promise<SavedTranslation> {
  const res = await authenticatedFetch(`${apiBase}/api/translate/history`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify(payload),
  }, authToken);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<SavedTranslation>;
}

export async function deleteTranslationFromServer(
  id: string,
  authToken?: string,
): Promise<void> {
  const res = await authenticatedFetch(`${apiBase}/api/translate/history/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  }, authToken);
  if (!res.ok) throw await parseError(res);
}

// ── Perspectivas ──────────────────────────────────────────────────────────────

export type PerspectiveMeta = {
  index: number;
  key: string;
  label: string;
  icon: string;
  color: string;
  text: string;
  sources?: PerspectivesResult['sources'];
};

export type PerspectivesResult = {
  perspectives: PerspectiveMeta[];
  sources: Array<{ documentId: string; chunkId: string; title: string; chunkIndex: number; score?: number; sourceUrl?: string }>;
  conversationId?: string;
  model: string;
  durationMs: number;
};

export type PerspectivesCallbacks = {
  onPerspectiveStart: (index: number, meta: { label: string; icon: string; color: string }) => void;
  onPerspectiveToken: (index: number, token: string) => void;
  onPerspectiveDone: (index: number, text: string) => void;
};

export async function streamPerspectives(
  payload: ChatRequest,
  callbacks: PerspectivesCallbacks,
  signal?: AbortSignal,
): Promise<PerspectivesResult> {
  const res = await authenticatedFetch(`${apiBase}/api/chat/perspectives/stream`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({
      question: payload.question,
      model: payload.model,
      userId: payload.userId,
      conversationId: payload.conversationId || undefined,
      source: 'acoreai-web',
      useRag: true,
      useHistory: true,
      historyLimit: 4,
      keepAlive: '10m',
      options: { temperature: 0.85, num_ctx: 4096 },
    }),
    signal,
  }, payload.authToken);

  if (!res.ok || !res.body) throw await parseError(res);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let result: PerspectivesResult = {
    perspectives: [],
    sources: [],
    model: payload.model,
    durationMs: 0,
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const events = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const parsed = parseSseEvent(raw);
      if (!parsed) continue;

      if (parsed.event === 'perspective_start') {
        const idx = parsed.data.index as number;
        callbacks.onPerspectiveStart(idx, {
          label: String(parsed.data.label ?? ''),
          icon: String(parsed.data.icon ?? ''),
          color: String(parsed.data.color ?? '#00D4AA'),
        });
      }

      if (parsed.event === 'perspective_token') {
        const idx = parsed.data.perspectiveIndex as number;
        const token = String(parsed.data.token ?? '');
        if (token) await emitTokenWithDelay(token, (part) => callbacks.onPerspectiveToken(idx, part), signal);
      }

      if (parsed.event === 'perspective_done') {
        const idx = parsed.data.index as number;
        callbacks.onPerspectiveDone(idx, String(parsed.data.text ?? ''));
      }

      if (parsed.event === 'done') {
        result = {
          perspectives: (parsed.data.perspectives as PerspectiveMeta[]) ?? result.perspectives,
          sources: (parsed.data.sources as PerspectivesResult['sources']) ?? [],
          conversationId: String(parsed.data.conversationId ?? ''),
          model: String(parsed.data.model ?? payload.model),
          durationMs: Number(parsed.data.durationMs ?? 0),
        };
      }

      if (parsed.event === 'error') {
        throw new Error(String(parsed.data.message ?? 'Error generando perspectivas'));
      }
    }
  }

  return result;
}

export async function synthesizeSpeech(
  text: string,
  voice = 'ef_dora',
  speed = 1.0,
  signal?: AbortSignal,
): Promise<ArrayBuffer> {
  const res = await fetch(`${apiBase}/api/tts`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({ text, voice, speed }),
    signal,
  });
  if (!res.ok) throw await parseError(res);
  return res.arrayBuffer();
}

// ── AI Profile ────────────────────────────────────────────────────────────────

export interface AiProfileData {
  userId: string;
  preferredMode: string;
  mainGoal: string;
  englishLevel: string;
  interestTopics: string[];
  correctionStyle: string;
  practiceStyle: string;
  onboardingCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AiProfilePayload = Omit<AiProfileData, 'userId' | 'onboardingCompleted' | 'createdAt' | 'updatedAt'>;

export async function fetchAiProfile(token: string): Promise<AiProfileData | null> {
  const res = await authenticatedFetch(`${apiBase}/api/ai/profile`, {}, token);
  if (res.status === 404) return null;
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<AiProfileData>;
}

export async function saveAiProfile(payload: AiProfilePayload, token: string): Promise<AiProfileData> {
  const res = await authenticatedFetch(`${apiBase}/api/ai/profile`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify(payload),
  }, token);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<AiProfileData>;
}

export async function updateAiProfile(payload: AiProfilePayload, token: string): Promise<AiProfileData> {
  const res = await authenticatedFetch(`${apiBase}/api/ai/profile`, {
    method: 'PUT',
    headers: gatewayJsonHeaders,
    body: JSON.stringify(payload),
  }, token);
  if (!res.ok) throw await parseError(res);
  return res.json() as Promise<AiProfileData>;
}

// ── Language Adventure API ────────────────────────────────────────────────

const LANG_BASE = `${apiBase}/api/languages`;

export async function fetchLanguageDashboard(token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/me`, {}, token);
  if (!res.ok) return null;
  return res.json();
}

export async function createLanguageProfile(token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/profiles`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({ languageCode: 'EN' }),
  }, token);
  return res.json();
}

export async function generateAdventurePhase(token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/phases/generate`, {
    method: 'POST',
  }, token);
  return res.json();
}

export async function getAdventurePhase(phaseId: string, token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/phases/${phaseId}`, {}, token);
  return res.json();
}

export async function listAdventurePhases(token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/phases`, {}, token);
  return res.json();
}

export async function startLesson(lessonId: string, token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/lessons/${lessonId}/start`, {
    method: 'POST',
  }, token);
  return res.json();
}

export async function completeLesson(
  lessonId: string,
  data: { answers?: Record<string, string>; hintsUsed?: number },
  token: string,
) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/lessons/${lessonId}/complete`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify(data),
  }, token);
  return res.json();
}

export async function getAdventureExam(examId: string, token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/exams/${examId}`, {}, token);
  return res.json();
}

export async function submitExamAttempt(
  examId: string,
  data: { answers: Record<string, string> },
  token: string,
) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/exams/${examId}/attempts`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify(data),
  }, token);
  return res.json();
}

export async function getHiddenLevels(token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/hidden-levels`, {}, token);
  return res.json();
}

export async function completeHiddenLevel(hiddenLevelId: string, token: string) {
  const res = await authenticatedFetch(`${LANG_BASE}/adventure/hidden-levels/${hiddenLevelId}/complete`, {
    method: 'POST',
  }, token);
  return res.json();
}

export type DailySuggestion = {
  title: string;
  desc: string;
  prompt: string;
};

export async function generateDailySuggestion(
  userId: string,
  token: string,
  topics: string[],
  signal?: AbortSignal,
): Promise<DailySuggestion | null> {
  const topicList = topics.length > 0 ? topics.join(', ') : 'ciencia, historia, tecnología, universo, biología';
  const res = await authenticatedFetch(`${apiBase}/api/chat/stream`, {
    method: 'POST',
    headers: gatewayJsonHeaders,
    body: JSON.stringify({
      question: `Genera UNA sugerencia de tema fascinante y educativo para hoy. Los intereses del usuario son: ${topicList}. Responde ÚNICAMENTE con JSON exacto sin markdown: {"title":"una pregunta o afirmación intrigante y corta","desc":"descripción de 1-2 oraciones que genere curiosidad académica","prompt":"pregunta completa para iniciar la investigación en profundidad"}`,
      model: 'llama3.2:3b',
      userId,
      useRag: false,
      useHistory: false,
      source: 'acoreai-system',
      system: 'Eres el motor de sugerencias diarias de ACoreAI. Respondes ÚNICAMENTE con un objeto JSON válido. Sin explicaciones, sin markdown, sin texto extra.',
      keepAlive: '2m',
      options: { temperature: 0.95, num_ctx: 512 },
    }),
    signal,
  }, token);

  if (!res.ok || !res.body) return null;

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.replace(/\r\n/g, '\n').split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const parsed = parseSseEvent(raw);
      if (!parsed) continue;
      if (parsed.event === 'token') answer += String(parsed.data.token ?? '');
      if (parsed.event === 'done') answer = String(parsed.data.answer ?? answer);
    }
  }

  try {
    const jsonMatch = answer.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;
    const data = JSON.parse(jsonMatch[0]) as DailySuggestion;
    if (!data.title || !data.desc || !data.prompt) return null;
    return data;
  } catch {
    return null;
  }
}
