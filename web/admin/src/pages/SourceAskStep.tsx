import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import type { SourceOutletContext } from './SourceDetailLayout';
import { testQuestionApi } from '../lib/endpoints';
import { ApiError } from '../lib/api';
import { humanizeWarning } from '../lib/warnings';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { Send } from 'lucide-react';
import type { TestQuestionResult } from '../lib/types';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  result?: TestQuestionResult;
  error?: string;
}

export function SourceAskStep() {
  const { source } = useOutletContext<SourceOutletContext>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [question, setQuestion] = useState('');
  const [model, setModel] = useState('llama3.2:3b');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const askMutation = useMutation({
    mutationFn: (q: string) => testQuestionApi.ask(source.id, q, model || undefined),
  });

  const feedbackMutation = useMutation({
    mutationFn: ({ q, feedback }: { q: string; feedback: 'correct' | 'insufficient' }) =>
      testQuestionApi.feedback(source.id, q, feedback),
  });

  function handleAsk() {
    const q = question.trim();
    if (!q) return;

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: q };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion('');

    askMutation.mutate(q, {
      onSuccess: (result) => {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: result.answer, result }]);
      },
      onError: (err: unknown) => {
        const message = err instanceof ApiError ? err.message : 'No se pudo probar la pregunta';
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: '', error: message }]);
      },
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center text-xs text-slate-400">
          Esta prueba usa solo los chunks de esta fuente (con embedding generado), no el conocimiento ya publicado.
          <InfoHint text="Es distinto del chat real de ACoreAI (/chat/rag), que busca en TODO lo publicado. Aquí solo pruebas si ESTA fuente, sin publicar todavía, ya responde bien por sí sola." />
        </p>
        <input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="modelo (ej. llama3.2:3b)"
          title="Modelo de Ollama a usar para generar la respuesta de prueba (ej. llama3.2:3b). Déjalo vacío para usar el modelo por defecto del gateway."
          className="input w-48 text-xs"
        />
      </div>

      <div className="flex h-[28rem] flex-col rounded-xl border border-slate-200 bg-white shadow-card">
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {messages.length === 0 && (
            <p className="text-sm text-slate-400">Escribe una pregunta para probar esta fuente con ACoreAI.</p>
          )}

          {messages.map((m) => (
            <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  m.role === 'user' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-800'
                }`}
              >
                {m.error ? (
                  <span className="text-red-600">{m.error}</span>
                ) : (
                  <>
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {m.role === 'assistant' && m.result && (
                      <div className="mt-2 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => feedbackMutation.mutate({ q: findQuestionFor(messages, m.id), feedback: 'correct' })}
                          >
                            Correcta
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="border-red-300 text-red-700 hover:bg-red-50"
                            onClick={() => feedbackMutation.mutate({ q: findQuestionFor(messages, m.id), feedback: 'insufficient' })}
                          >
                            Insuficiente
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => setExpandedId(expandedId === m.id ? null : m.id)}>
                            {expandedId === m.id ? 'Ocultar detalle' : 'Ver fuentes y chunks'}
                          </Button>
                        </div>

                        {expandedId === m.id && (
                          <div className="space-y-2 rounded-md bg-white p-2 text-xs">
                            <div>
                              <strong className="flex items-center text-slate-500">
                                Fuentes usadas
                                <InfoHint text="Los documentos de donde salió el contexto que armó esta respuesta." />
                              </strong>
                              <ul className="space-y-0.5">
                                {m.result.sources.map((s, i) => (
                                  <li key={i} className="flex justify-between gap-2">
                                    <span>
                                      {s.title} {s.section ? `— ${s.section}` : ''}
                                    </span>
                                    <span className="text-slate-400" title="Qué tan relevante es este resultado para la pregunta (más alto = más relevante). No es un porcentaje de certeza.">
                                      score {s.score.toFixed(2)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div>
                              <strong className="flex items-center text-slate-500">
                                Chunks recuperados
                                <InfoHint text="Los fragmentos exactos de texto que se le pasaron al modelo como contexto para responder — así puedes verificar si el contexto era el correcto." />
                              </strong>
                              <ul className="space-y-1">
                                {m.result.chunksRetrieved.map((c) => (
                                  <li key={c.chunkId} className="rounded-md bg-slate-50 p-2">
                                    <div className="mb-1 flex justify-between text-slate-400">
                                      <span>{c.sectionTitle ?? 'Sin sección'}</span>
                                      <span title="Qué tan relevante es este chunk para la pregunta (más alto = más relevante).">score {c.score.toFixed(3)}</span>
                                    </div>
                                    <p className="line-clamp-3 text-slate-600">{c.content}</p>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {m.result.warnings.length > 0 && (
                              <div>
                                <strong className="block text-amber-700">Advertencias</strong>
                                <ul className="list-inside list-disc text-amber-700">
                                  {m.result.warnings.map((w) => (
                                    <li key={w}>{humanizeWarning(w)}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}

          {askMutation.isPending && <p className="text-xs text-slate-400">ACoreAI está pensando...</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-200 p-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleAsk();
              }
            }}
            placeholder="¿Cuáles son los requisitos de matrícula?"
            className="input flex-1"
          />
          <Button onClick={handleAsk} disabled={!question.trim()} loading={askMutation.isPending} icon={<Send className="h-3.5 w-3.5" />}>
            Enviar
          </Button>
        </div>
      </div>
    </div>
  );
}

function findQuestionFor(messages: ChatMessage[], assistantId: string): string {
  const idx = messages.findIndex((m) => m.id === assistantId);
  for (let i = idx - 1; i >= 0; i--) {
    if (messages[i].role === 'user') return messages[i].content;
  }
  return '';
}
