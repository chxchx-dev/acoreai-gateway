import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ObservabilityService } from 'src/infrastructure/observability/observability.service';
import {
  OllamaApiChatResponse,
  OllamaApiChatStreamChunk,
  OllamaAvailableModelsResponse,
  OllamaChatParams,
  OllamaChatResult,
  OllamaEmbedResponse,
  OllamaHealthResult,
  OllamaListModelsResponse,
} from './types/ollama.types';

@Injectable()
export class OllamaService {
  private static readonly modelsCacheTtlMs = 30000;
  private static readonly modelFallbacks: Record<string, string[]> = {
    fast:    ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.2:3b', 'llama3.2', 'llama3.2:latest', 'llama3.1:8b'],
    ligero:  ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.2:3b', 'llama3.2', 'llama3.2:latest', 'llama3.1:8b'],
    alania:  ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.2:3b', 'llama3.2:latest', 'llama3.1:8b'],
    deep:    ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.1:8b', 'llama3.1', 'llama3.1:latest', 'llama3:8b', 'llama3.2:3b'],
    expert:  ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.1:8b', 'llama3.1', 'llama3.1:latest', 'llama3:8b', 'llama3.2:3b'],
    experto: ['qwen3:4b', 'qwen3', 'qwen3:latest', 'llama3.1:8b', 'llama3.1', 'llama3.1:latest', 'llama3:8b', 'llama3.2:3b'],
    'llama3.2:1b': ['llama3.2:3b', 'llama3.2', 'llama3.2:latest'],
    'llama3.1:8b': ['qwen3:4b', 'qwen3', 'llama3.1', 'llama3.1:latest', 'llama3:8b', 'llama3:latest', 'llama3.2:3b'],
    'llama3.2:3b': ['qwen3:4b', 'qwen3', 'llama3.2', 'llama3.2:latest', 'llama3.1:8b'],
    'qwen3:4b':    ['qwen3', 'qwen3:latest', 'llama3.2:3b', 'llama3.2', 'llama3.2:latest', 'llama3.1:8b'],
    'translategemma:4b': ['translategemma', 'translategemma:latest'],
  };

  private readonly logger = new Logger(OllamaService.name);
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly numThread: number;
  private modelsCache?: {
    expiresAt: number;
    value: OllamaAvailableModelsResponse;
  };

  constructor(
    private readonly config: ConfigService,
    private readonly observability: ObservabilityService,
  ) {
    this.baseUrl =
      this.config.get<string>('MODEL_SERVER_URL') ??
      this.config.get<string>('OLLAMA_BASE_URL') ??
      'http://localhost:11434';
    this.timeoutMs = this.config.get<number>('REQUEST_TIMEOUT_MS', 60000);
    // 0 deja que Ollama autodetecte y use todos los hilos disponibles en el
    // servidor del modelo (también funciona si el servidor es remoto).
    this.numThread = this.config.get<number>('OLLAMA_NUM_THREAD', 0);
  }

  async chat(params: OllamaChatParams): Promise<OllamaChatResult> {
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    let status: 'ok' | 'error' = 'error';
    let metadata: OllamaApiChatResponse | undefined;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          options: this.buildOptions(params.options),
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama respondió con status ${response.status}: ${text}`);
      }

      const data = (await response.json()) as OllamaApiChatResponse;
      status = 'ok';
      metadata = data;
      return { content: data.message.content, raw: data };
    } catch (err: unknown) {
      this.observability.incrementError('ollama', this.errorKind(err));
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Ollama timeout');
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this.observability.observeOllama({
        operation: 'chat',
        model: params.model,
        status,
        durationMs: Date.now() - start,
        totalDurationNs: metadata?.total_duration,
        evalCount: metadata?.eval_count,
        promptEvalCount: metadata?.prompt_eval_count,
      });
    }
  }

  async *chatStream(
    params: OllamaChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<OllamaApiChatStreamChunk> {
    const start = Date.now();
    let status: 'ok' | 'error' = 'error';
    let metadata: OllamaApiChatStreamChunk | undefined;
    let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...params,
          options: this.buildOptions(params.options),
          stream: true,
        }),
        signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama respondió con status ${response.status}: ${text}`);
      }

      if (!response.body) {
        throw new Error('Ollama no devolvió stream');
      }

      reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          const chunk = JSON.parse(trimmed) as OllamaApiChatStreamChunk;
          if (chunk.done) {
            metadata = chunk;
            status = 'ok';
          }
          yield chunk;
        }
      }

      const finalLine = buffer.trim();
      if (finalLine) {
        const chunk = JSON.parse(finalLine) as OllamaApiChatStreamChunk;
        if (chunk.done) {
          metadata = chunk;
          status = 'ok';
        }
        yield chunk;
      }
    } catch (err: unknown) {
      this.observability.incrementError('ollama_stream', this.errorKind(err));
      throw err;
    } finally {
      if (reader && !signal?.aborted) {
        await reader.cancel().catch(() => undefined);
      }
      reader?.releaseLock();
      this.observability.observeOllama({
        operation: 'chat_stream',
        model: params.model,
        status,
        durationMs: Date.now() - start,
        totalDurationNs: metadata?.total_duration,
        evalCount: metadata?.eval_count,
        promptEvalCount: metadata?.prompt_eval_count,
      });
    }
  }

  async embed(input: string | string[]): Promise<number[][]> {
    const embeddingModel = this.config.get<string>(
      'OLLAMA_EMBEDDING_MODEL',
      'embeddinggemma',
    );
    const inputs = Array.isArray(input) ? input : [input];
    const start = Date.now();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    let status: 'ok' | 'error' = 'error';

    try {
      const response = await fetch(`${this.baseUrl}/api/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: embeddingModel,
          input: inputs,
          options: this.buildOptions(),
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Ollama embed error ${response.status}: ${text}`);
      }

      const data = (await response.json()) as OllamaEmbedResponse;
      status = 'ok';
      return data.embeddings;
    } catch (err: unknown) {
      this.observability.incrementError('ollama_embed', this.errorKind(err));
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error('Ollama embed timeout');
      }
      throw err;
    } finally {
      clearTimeout(timer);
      this.observability.observeOllama({
        operation: 'embed',
        model: embeddingModel,
        status,
        durationMs: Date.now() - start,
      });
    }
  }

  async listModels(): Promise<OllamaListModelsResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Ollama respondió con status ${response.status}`);
      }

      return (await response.json()) as OllamaListModelsResponse;
    } finally {
      clearTimeout(timer);
    }
  }

  async listAvailableModels(forceRefresh = false): Promise<OllamaAvailableModelsResponse> {
    if (
      !forceRefresh &&
      this.modelsCache &&
      this.modelsCache.expiresAt > Date.now()
    ) {
      return this.modelsCache.value;
    }

    const response = await this.listModels();
    const models = response.models
      .map((model) => ({
        name: model.name,
        label: model.name,
        size: model.size,
        modifiedAt: model.modified_at,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    const value = {
      models,
      modelNames: models.map((model) => model.name),
    };

    this.modelsCache = {
      expiresAt: Date.now() + OllamaService.modelsCacheTtlMs,
      value,
    };

    return value;
  }

  async isModelAvailable(modelName: string): Promise<boolean> {
    return (await this.resolveAvailableModelName(modelName)) !== null;
  }

  async resolveAvailableModelName(modelName: string): Promise<string | null> {
    const candidates = this.getModelCandidates(modelName);
    const { modelNames } = await this.listAvailableModels();
    const cachedMatch = this.findModelMatch(candidates, modelNames);
    if (cachedMatch) {
      return cachedMatch;
    }

    const refreshed = await this.listAvailableModels(true);
    return this.findModelMatch(candidates, refreshed.modelNames);
  }

  async checkHealth(): Promise<OllamaHealthResult> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: controller.signal,
      });

      if (!response.ok) {
        return { status: 'error', message: 'Ollama no respondió correctamente' };
      }

      return { status: 'ok', baseUrl: this.baseUrl };
    } catch (err: unknown) {
      this.logger.warn(`Ollama health check falló: ${err instanceof Error ? err.message : String(err)}`);
      return { status: 'error', message: 'No se pudo conectar con Ollama' };
    } finally {
      clearTimeout(timer);
    }
  }

  private buildOptions(
    options: Record<string, boolean | number | string> = {},
  ): Record<string, boolean | number | string> {
    if (this.numThread < 1) {
      return options;
    }

    return { ...options, num_thread: this.numThread };
  }

  private getModelCandidates(modelName: string): string[] {
    const normalized = modelName.trim();
    const fallbackKey = normalized.toLowerCase();
    const configured = OllamaService.modelFallbacks[fallbackKey] ?? [];
    return Array.from(new Set([normalized, ...configured]));
  }

  private findModelMatch(
    candidates: string[],
    modelNames: string[],
  ): string | null {
    for (const candidate of candidates) {
      if (modelNames.includes(candidate)) {
        return candidate;
      }

      if (!candidate.includes(':')) {
        const latest = `${candidate}:latest`;
        if (modelNames.includes(latest)) {
          return latest;
        }
      }
    }

    return null;
  }

  private errorKind(err: unknown): string {
    if (err instanceof Error) {
      return err.name === 'AbortError' ? 'abort' : err.name;
    }

    return 'unknown';
  }
}
