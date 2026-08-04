import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  LogOut,
  RefreshCw,
  Send,
  TerminalSquare,
  Volume2,
} from 'lucide-react';
import { translateTextStream } from '../lib/gateway';
import { api } from '../admin/lib/api';
import { clearSession, getStoredUser, getToken } from '../admin/lib/auth';

const API_BASE = import.meta.env.DEV ? '/ai/api' : '/api';
const DEFAULT_MODEL = 'llama3.2:3b';
const DEFAULT_TRANSLATION_MODEL = 'translategemma:4b';

type HealthState = 'idle' | 'checking' | 'ok' | 'error';
type ChatMessage = { role: 'user' | 'assistant'; content: string };
type Voice = { id?: string; name?: string; label?: string };
type Model = { name?: string; model?: string; size?: number };

const LANGUAGES = [
  { key: 'espanol', label: 'Español' },
  { key: 'ingles', label: 'Inglés' },
  { key: 'frances', label: 'Francés' },
  { key: 'portugues', label: 'Portugués' },
  { key: 'aleman', label: 'Alemán' },
  { key: 'chino', label: 'Chino' },
  { key: 'italiano', label: 'Italiano' },
  { key: 'japones', label: 'Japonés' },
];

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'No se pudo completar la operación.';
}

function parseSseEvent(raw: string): { event: string; data: Record<string, unknown> } | null {
  const lines = raw.split('\n');
  const event = lines.find((line) => line.startsWith('event:'))?.slice(6).trim();
  const data = lines.filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).join('\n');
  if (!event || !data) return null;
  try {
    return { event, data: JSON.parse(data) as Record<string, unknown> };
  } catch {
    return null;
  }
}

async function streamChat(
  body: Record<string, unknown>,
  onToken: (token: string) => void,
): Promise<string> {
  const token = getToken();
  const response = await fetch(`${API_BASE}/chat/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error((await response.text()) || `Gateway respondió ${response.status}`);
  if (!response.body) throw new Error('El gateway no devolvió un stream de respuesta.');

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let answer = '';

  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value ?? new Uint8Array(), { stream: !done });
    const events = buffer.split('\n\n');
    buffer = done ? '' : events.pop() ?? '';
    for (const rawEvent of events) {
      const parsed = parseSseEvent(rawEvent);
      if (!parsed) continue;
      if (parsed.event === 'token') {
        const tokenText = String(parsed.data.token ?? '');
        answer += tokenText;
        onToken(tokenText);
      }
      if (parsed.event === 'done') answer = String(parsed.data.answer ?? answer);
      if (parsed.event === 'error') throw new Error(String(parsed.data.message ?? 'Error en el stream.'));
    }
    if (done) break;
  }
  return answer;
}

function StatusPill({ state, label }: { state: HealthState; label: string }) {
  const isOk = state === 'ok';
  const isError = state === 'error';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${isOk ? 'bg-emerald-50 text-emerald-700' : isError ? 'bg-rose-50 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
      {isOk ? <CheckCircle2 className="h-3.5 w-3.5" /> : isError ? <CircleAlert className="h-3.5 w-3.5" /> : <span className="h-2 w-2 rounded-full bg-current" />}
      {label}
    </span>
  );
}

export function AdminDevApp() {
  const user = getStoredUser();
  const token = getToken();
  const [gatewayHealth, setGatewayHealth] = useState<HealthState>('idle');
  const [ollamaHealth, setOllamaHealth] = useState<HealthState>('idle');
  const [models, setModels] = useState<Model[]>([]);
  const [voices, setVoices] = useState<Voice[]>([]);
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [question, setQuestion] = useState('¿Qué capacidades tiene este gateway?');
  const [systemPrompt, setSystemPrompt] = useState('Responde de forma clara y breve.');
  const [source, setSource] = useState('acoreai-admin-dev');
  const [temperature, setTemperature] = useState('0.7');
  const [useRag, setUseRag] = useState(false);
  const [useStream, setUseStream] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [translationText, setTranslationText] = useState('Hello, welcome to ACoreAI.');
  const [translationLanguages, setTranslationLanguages] = useState<string[]>(['espanol']);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationLoading, setTranslationLoading] = useState(false);
  const [voice, setVoice] = useState('');
  const [voiceText, setVoiceText] = useState('Hola, soy una prueba de voz del gateway.');
  const [voiceLoading, setVoiceLoading] = useState(false);
  const [diagnosticError, setDiagnosticError] = useState<string | null>(null);

  const displayName = user?.name ?? user?.email ?? 'Administrador';
  const selectedVoice = useMemo(() => voices.find((item) => (item.id ?? item.name) === voice), [voice, voices]);

  const checkDiagnostics = useCallback(async () => {
    setDiagnosticError(null);
    setGatewayHealth('checking');
    setOllamaHealth('checking');
    try {
      await api.get('/health/ready');
      setGatewayHealth('ok');
    } catch (error) {
      setGatewayHealth('error');
      setDiagnosticError(errorMessage(error));
    }
    try {
      const [ollama, modelResponse, voiceResponse] = await Promise.all([
        api.get('/ollama/health'),
        api.get<{ models?: Model[] }>('/ollama/models'),
        api.get<{ voices?: Record<string, Voice[]> }>('/tts/voices'),
      ]);
      void ollama;
      setOllamaHealth('ok');
      const availableModels = modelResponse.models ?? [];
      setModels(availableModels);
      if (!model && availableModels[0]) setModel(availableModels[0].name ?? availableModels[0].model ?? DEFAULT_MODEL);
      const availableVoices = Object.values(voiceResponse.voices ?? {}).flat();
      setVoices(availableVoices);
      if (!voice && availableVoices[0]) setVoice(availableVoices[0].id ?? availableVoices[0].name ?? '');
    } catch (error) {
      setOllamaHealth('error');
      setDiagnosticError((current) => current ?? errorMessage(error));
    }
  }, [model, voice]);

  useEffect(() => {
    void checkDiagnostics();
  }, [checkDiagnostics]);

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!question.trim() || !user || !token) return;
    const nextQuestion = question.trim();
    const body = {
      question: nextQuestion,
      userId: user.id,
      model: model.trim() || undefined,
      source: source.trim() || 'acoreai-admin-dev',
      useRag,
      useHistory: true,
      historyLimit: 12,
      system: systemPrompt.trim() || undefined,
      options: { temperature: Number(temperature) || 0.7, num_ctx: 4096 },
    };
    setChatMessages((current) => [...current, { role: 'user', content: nextQuestion }, { role: 'assistant', content: '' }]);
    setQuestion('');
    setChatError(null);
    setChatLoading(true);
    try {
      if (useStream) {
        await streamChat(body, (chunk) => {
          setChatMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: message.content + chunk } : message));
        });
      } else {
        const result = await api.post<{ answer?: string }>('/chat', body);
        setChatMessages((current) => current.map((message, index) => index === current.length - 1 ? { ...message, content: result.answer ?? 'El gateway no devolvió una respuesta.' } : message));
      }
    } catch (error) {
      const message = errorMessage(error);
      setChatError(message);
      setChatMessages((current) => current.map((item, index) => index === current.length - 1 ? { ...item, content: `Error: ${message}` } : item));
    } finally {
      setChatLoading(false);
    }
  }

  async function runTranslation(event: FormEvent) {
    event.preventDefault();
    if (!translationText.trim() || translationLanguages.length === 0 || !token) return;
    setTranslationLoading(true);
    setTranslations(Object.fromEntries(translationLanguages.map((language) => [language, ''])));
    try {
      await translateTextStream(
        translationText.trim(),
        translationLanguages,
        DEFAULT_TRANSLATION_MODEL,
        (language, chunk) => setTranslations((current) => ({ ...current, [language]: `${current[language] ?? ''}${chunk}` })),
        (language, result) => setTranslations((current) => ({ ...current, [language]: result })),
        undefined,
        token,
      );
    } catch (error) {
      setDiagnosticError(errorMessage(error));
    } finally {
      setTranslationLoading(false);
    }
  }

  async function testVoice() {
    if (!voice || !voiceText.trim() || !token) return;
    setVoiceLoading(true);
    setDiagnosticError(null);
    try {
      const response = await fetch(`${API_BASE}/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ text: voiceText.trim(), voice, speed: 1 }),
      });
      if (!response.ok) throw new Error((await response.text()) || `TTS respondió ${response.status}`);
      const audio = new Audio(URL.createObjectURL(await response.blob()));
      audio.addEventListener('ended', () => URL.revokeObjectURL(audio.src), { once: true });
      await audio.play();
    } catch (error) {
      setDiagnosticError(errorMessage(error));
    } finally {
      setVoiceLoading(false);
    }
  }

  function toggleLanguage(language: string) {
    setTranslationLanguages((current) => current.includes(language) ? current.filter((item) => item !== language) : [...current, language]);
  }

  if (!token) {
    return <AccessMessage message="Inicia sesión como administrador para abrir Admin Dev." actionHref="/admin/login" actionLabel="Ir al login" />;
  }
  if (user?.role !== 'ADMIN') {
    return <AccessMessage message="Admin Dev está reservado para administradores de plataforma." actionHref="/" actionLabel="Volver a la app" />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <TerminalSquare className="h-7 w-7 text-brand-600" />
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-600">ACoreAI</p>
              <h1 className="text-xl font-bold">Admin Dev</h1>
            </div>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="hidden text-slate-500 sm:inline">{displayName}</span>
            <a href="/admin" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 hover:bg-slate-50">
              <ArrowLeft className="h-4 w-4" /> Centro admin
            </a>
            <button type="button" onClick={() => { clearSession(); window.location.assign('/admin/login'); }} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-slate-500 hover:bg-slate-100">
              <LogOut className="h-4 w-4" /> Salir
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-6">
        <section className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-900">
          <strong>Entorno de desarrollo.</strong> Esta consola reemplaza el antiguo HTML suelto del gateway. Usa la sesión JWT del administrador y no pide ni expone la clave interna del gateway.
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <DiagnosticCard label="Gateway" state={gatewayHealth} detail="health/ready" />
          <DiagnosticCard label="Ollama" state={ollamaHealth} detail={`${models.length} modelos disponibles`} />
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div><p className="text-sm font-semibold text-slate-800">Acciones</p><p className="text-xs text-slate-500">Diagnóstico y configuración local</p></div>
              <button type="button" onClick={() => void checkDiagnostics()} className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50" title="Actualizar diagnóstico"><RefreshCw className="h-4 w-4" /></button>
            </div>
            {diagnosticError && <p className="mt-3 text-xs text-rose-600">{diagnosticError}</p>}
          </div>
        </section>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Gateway playground</h2><p className="text-sm text-slate-500">Prueba chat, RAG, streaming y parámetros del modelo.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">/api/chat</span></div>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Modelo"><input list="dev-models" value={model} onChange={(event) => setModel(event.target.value)} className="dev-input" /><datalist id="dev-models">{models.map((item) => <option key={item.name ?? item.model} value={item.name ?? item.model} />)}</datalist></Field>
              <Field label="Temperatura"><input type="number" min="0" max="2" step="0.05" value={temperature} onChange={(event) => setTemperature(event.target.value)} className="dev-input" /></Field>
              <Field label="Source"><input value={source} onChange={(event) => setSource(event.target.value)} className="dev-input" /></Field>
              <Field label="System prompt"><input value={systemPrompt} onChange={(event) => setSystemPrompt(event.target.value)} className="dev-input" /></Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600"><label className="inline-flex items-center gap-2"><input type="checkbox" checked={useRag} onChange={(event) => setUseRag(event.target.checked)} /> Usar RAG</label><label className="inline-flex items-center gap-2"><input type="checkbox" checked={useStream} onChange={(event) => setUseStream(event.target.checked)} /> Streaming SSE</label></div>
            <div className="mt-4 min-h-48 space-y-3 rounded-lg bg-slate-50 p-4">{chatMessages.length === 0 && <p className="text-sm text-slate-400">La respuesta de prueba aparecerá aquí.</p>}{chatMessages.map((message, index) => <div key={`${message.role}-${index}`} className={`rounded-lg p-3 text-sm ${message.role === 'user' ? 'ml-8 bg-brand-50 text-brand-900' : 'mr-8 border border-slate-200 bg-white text-slate-700'}`}><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{message.role === 'user' ? 'Pregunta' : 'Respuesta'}</p><p className="whitespace-pre-wrap">{message.content || (chatLoading && index === chatMessages.length - 1 ? 'Escribiendo…' : '')}</p></div>)}</div>
            {chatError && <p className="mt-3 text-sm text-rose-600">{chatError}</p>}
            <form onSubmit={sendChat} className="mt-4 flex gap-2"><textarea value={question} onChange={(event) => setQuestion(event.target.value)} rows={2} className="dev-input resize-y" placeholder="Escribe una pregunta de prueba…" /><button type="submit" disabled={chatLoading || !question.trim()} className="inline-flex shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"><Send className="h-4 w-4" />{chatLoading ? 'Probando' : 'Enviar'}</button></form>
          </section>

          <div className="space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold">Prueba de voz</h2><p className="mt-1 text-sm text-slate-500">Consulta el catálogo TTS y reproduce una muestra.</p><select value={voice} onChange={(event) => setVoice(event.target.value)} className="dev-input mt-4">{voices.length === 0 && <option value="">No hay voces disponibles</option>}{voices.map((item) => { const id = item.id ?? item.name ?? ''; return <option key={id} value={id}>{item.label ?? item.name ?? id}</option>; })}</select><textarea value={voiceText} onChange={(event) => setVoiceText(event.target.value)} rows={3} className="dev-input mt-3" /><button type="button" onClick={() => void testVoice()} disabled={voiceLoading || !voice} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Volume2 className="h-4 w-4" />{voiceLoading ? 'Generando audio…' : 'Probar voz'}</button><p className="mt-2 text-xs text-slate-400">{selectedVoice ? `Voz seleccionada: ${selectedVoice.label ?? selectedVoice.name ?? selectedVoice.id}` : 'Carga el catálogo para elegir una voz.'}</p></section>
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Traducción</h2><p className="mt-1 text-sm text-slate-500">Prueba el stream multiidioma.</p></div><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{DEFAULT_TRANSLATION_MODEL}</span></div><form onSubmit={runTranslation} className="mt-4"><textarea value={translationText} onChange={(event) => setTranslationText(event.target.value)} rows={3} className="dev-input" /> <div className="mt-3 flex flex-wrap gap-2">{LANGUAGES.map((language) => <button type="button" key={language.key} onClick={() => toggleLanguage(language.key)} className={`rounded-full border px-2.5 py-1 text-xs ${translationLanguages.includes(language.key) ? 'border-brand-600 bg-brand-50 text-brand-700' : 'border-slate-200 text-slate-500'}`}>{language.label}</button>)}</div><button type="submit" disabled={translationLoading || translationLanguages.length === 0} className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 disabled:opacity-50">{translationLoading && <LoaderCircle className="h-4 w-4 animate-spin" />}Probar traducción</button></form><div className="mt-4 space-y-2">{Object.entries(translations).map(([language, text]) => <div key={language} className="rounded-lg bg-slate-50 p-3 text-sm"><p className="mb-1 text-xs font-semibold uppercase text-slate-400">{language}</p><p className="whitespace-pre-wrap">{text || 'Esperando respuesta…'}</p></div>)}</div></section>
          </div>
        </div>
      </main>
    </div>
  );
}

function AccessMessage({ message, actionHref, actionLabel }: { message: string; actionHref: string; actionLabel: string }) {
  return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><CircleAlert className="mx-auto h-10 w-10 text-amber-500" /><h1 className="mt-4 text-xl font-bold text-slate-800">Acceso restringido</h1><p className="mt-2 text-sm text-slate-500">{message}</p><a href={actionHref} className="mt-6 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white">{actionLabel}</a></section></main>;
}

function DiagnosticCard({ label, state, detail }: { label: string; state: HealthState; detail: string }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><p className="text-sm font-semibold text-slate-800">{label}</p><StatusPill state={state} label={state === 'checking' ? 'Comprobando' : state === 'ok' ? 'Operativo' : state === 'error' ? 'Error' : 'Sin comprobar'} /></div><p className="mt-3 text-xs text-slate-500">{detail}</p></div>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block text-sm"><span className="mb-1.5 block text-xs font-medium text-slate-500">{label}</span>{children}</label>;
}
