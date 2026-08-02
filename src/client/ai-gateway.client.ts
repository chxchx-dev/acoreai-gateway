export interface AiChatRequest {
  question: string;
  model: string;
  userId?: string;
  conversationId?: string;
  source?: string;
  useRag?: boolean;
  useHistory?: boolean;
  historyLimit?: number;
  system?: string;
  options?: AiChatOptions;
  keepAlive?: string;
}

export interface AiChatOptions {
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

export interface AiChatSource {
  documentId: string;
  chunkId: string;
  title: string;
  chunkIndex: number;
  score?: number;
}

export interface AiChatResponse {
  answer: string | null;
  model: string;
  durationMs: number;
  status: 'answered' | 'no_context' | 'error';
  sources: AiChatSource[];
  conversationId?: string;
  messageId?: string;
  historyUsed?: number;
  error?: string;
}

export interface AiGatewayClientOptions {
  baseUrl: string;
  apiKey: string;
  timeoutMs?: number;
}

export interface AiModelOption {
  name: string;
  label: string;
  size: number;
  modifiedAt: string;
}

export interface AiModelsResponse {
  models: AiModelOption[];
  modelNames: string[];
}

export class AiGatewayClient {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  constructor(options: AiGatewayClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.apiKey = options.apiKey;
    this.timeoutMs = options.timeoutMs ?? 90000;
  }

  async chat(payload: AiChatRequest): Promise<AiChatResponse> {
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

      return (await res.json()) as AiChatResponse;
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
    payload: AiChatRequest,
    onToken: (token: string) => void,
  ): Promise<AiChatResponse | null> {
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
    let finalResponse: AiChatResponse | null = null;

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
          finalResponse = event.data as unknown as AiChatResponse;
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

  async listModels(): Promise<AiModelsResponse> {
    const res = await fetch(`${this.baseUrl}/api/ollama/models`, {
      headers: {
        'x-ai-gateway-key': this.apiKey,
      },
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`AI Gateway respondió ${res.status}: ${body}`);
    }

    return (await res.json()) as AiModelsResponse;
  }

  async health(): Promise<{ status: string; service: string; timestamp: string }> {
    const res = await fetch(`${this.baseUrl}/health`);
    return (await res.json()) as { status: string; service: string; timestamp: string };
  }
}

/**
 * Crea el cliente a partir de variables de entorno de AI.
 *
 * Variables requeridas en AI:
 *   AI_GATEWAY_URL=https://ai.tudominio.com
 *   AI_GATEWAY_KEY=tu_clave_interna
 *   AI_GATEWAY_USE_RAG=true
 */
export function createAiGatewayClient(): AiGatewayClient {
  const baseUrl = process.env['AI_GATEWAY_URL'];
  const apiKey = process.env['AI_GATEWAY_KEY'];

  if (!baseUrl || !apiKey) {
    throw new Error(
      'Faltan variables de entorno: AI_GATEWAY_URL y AI_GATEWAY_KEY son requeridas',
    );
  }

  return new AiGatewayClient({ baseUrl, apiKey });
}

/** Convierte el status del gateway al mensaje de UI apropiado para mostrar al usuario. */
export function resolveUserMessage(response: AiChatResponse): string {
  switch (response.status) {
    case 'answered':
      return response.answer ?? '';
    case 'no_context':
      return 'No encontré información suficiente en la base cargada.';
    case 'error':
      return 'El asistente no está disponible en este momento.';
  }
}
