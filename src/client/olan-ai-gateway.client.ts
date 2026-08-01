export interface OlanAiChatRequest {
  question: string;
  model: string;
  userId?: string;
  conversationId?: string;
  source?: string;
  useRag?: boolean;
  useHistory?: boolean;
  historyLimit?: number;
  system?: string;
  options?: OlanAiChatOptions;
  keepAlive?: string;
}

export interface OlanAiChatOptions {
  temperature?: number;
  num_ctx?: number;
  num_predict?: number;
  top_p?: number;
  top_k?: number;
  repeat_penalty?: number;
  seed?: number;
  num_batch?: number;
  num_keep?: number;
}

export interface OlanAiChatSource {
  documentId: string;
  chunkId: string;
  title: string;
  chunkIndex: number;
  score?: number;
}

export interface OlanAiChatResponse {
  answer: string | null;
  model: string;
  durationMs: number;
  status: 'answered' | 'no_context' | 'error';
  sources: OlanAiChatSource[];
  conversationId?: string;
  messageId?: string;
  historyUsed?: number;
  error?: string;
}

export interface OlanAiGatewayClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface OlanAiModelOption {
  name: string;
  label: string;
  size: number;
  modifiedAt: string;
}

export interface OlanAiModelsResponse {
  models: OlanAiModelOption[];
  modelNames: string[];
}

export class OlanAiGatewayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: OlanAiGatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 90000;
  }

  async chat(payload: OlanAiChatRequest): Promise<OlanAiChatResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const res = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-ai-gateway-key': this.apiKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      if (!res.ok) {
        const body = await res.text();
        throw new Error(`AI Gateway respondió ${res.status}: ${body}`);
      }

      return (await res.json()) as OlanAiChatResponse;
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('AI Gateway timeout');
      }
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }

  async streamChat(
    payload: OlanAiChatRequest,
    onToken: (token: string) => void,
  ): Promise<OlanAiChatResponse | null> {
    const res = await fetch(`${this.baseUrl}/api/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-ai-gateway-key': this.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok || !res.body) {
      const body = await res.text();
      throw new Error(`AI Gateway respondió ${res.status}: ${body}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let finalResponse: OlanAiChatResponse | null = null;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop() ?? '';

      for (const rawEvent of events) {
        const event = this.parseStreamEvent(rawEvent);
        if (!event) continue;

        if (event.type === 'token') {
          onToken(String(event.data['token'] ?? ''));
        }

        if (event.type === 'done') {
          finalResponse = event.data as unknown as OlanAiChatResponse;
        }

        if (event.type === 'error') {
          throw new Error(String(event.data['message'] ?? 'AI Gateway stream error'));
        }
      }
    }

    return finalResponse;
  }

  private parseStreamEvent(
    rawEvent: string,
  ): { type: string; data: Record<string, unknown> } | null {
    const lines = rawEvent.split('\n');
    const eventLine = lines.find((line) => line.startsWith('event: '));
    const dataLine = lines.find((line) => line.startsWith('data: '));

    if (!eventLine || !dataLine) {
      return null;
    }

    return {
      type: eventLine.slice(7).trim(),
      data: JSON.parse(dataLine.slice(6)) as Record<string, unknown>,
    };
  }

  async listModels(): Promise<OlanAiModelsResponse> {
    const res = await fetch(`${this.baseUrl}/api/ollama/models`, {
      headers: {
        'x-ai-gateway-key': this.apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI Gateway respondió ${res.status}: ${body}`);
    }

    return (await res.json()) as OlanAiModelsResponse;
  }

  async health(): Promise<{ status: string; service: string; timestamp: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    return (await res.json()) as { status: string; service: string; timestamp: string };
  }
}

/**
 * Crea el cliente a partir de variables de entorno de Olan.
 *
 * Variables requeridas en Olan:
 *   OLAN_AI_GATEWAY_URL=https://ai.tudominio.com
 *   OLAN_AI_GATEWAY_KEY=tu_clave_interna
 *   OLAN_AI_USE_RAG=true
 */
export function createOlanAiGatewayClient(): OlanAiGatewayClient {
  const baseUrl = process.env['OLAN_AI_GATEWAY_URL'];
  const apiKey = process.env['OLAN_AI_GATEWAY_KEY'];

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Faltan variables de entorno: OLAN_AI_GATEWAY_URL y OLAN_AI_GATEWAY_KEY son requeridas',
    );
  }

  return new OlanAiGatewayClient({ baseUrl, apiKey });
}

/** Convierte el status del gateway al mensaje de UI apropiado para mostrar al usuario. */
export function resolveUserMessage(response: OlanAiChatResponse): string {
  switch (response.status) {
    case 'answered':
      return response.answer ?? '';
    case 'no_context':
      return 'No encontré información suficiente en la base cargada.';
    case 'error':
      return 'El asistente no está disponible en este momento.';
  }
}
