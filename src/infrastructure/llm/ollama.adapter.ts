import { Injectable } from '@nestjs/common';
import { OllamaService } from 'src/modules/ollama/ollama.service';
import {
  OllamaApiChatStreamChunk,
  OllamaChatParams,
  OllamaChatResult,
} from 'src/modules/ollama/types/ollama.types';
import { LlmPort } from 'src/application/ports/llm.port';
import { ChatParams, ChatResult, ChatStreamChunk } from 'src/domain/ai/llm.types';

/**
 * Hoy la forma de OllamaChatParams/Result/StreamChunk coincide exactamente con
 * los tipos de dominio, así que el mapeo es directo. Si el wire format de
 * Ollama cambia, solo estas funciones necesitan ajustarse — el puerto no se entera.
 */
function toOllamaParams(params: ChatParams): OllamaChatParams {
  return params;
}

function toChatResult(result: OllamaChatResult): ChatResult {
  return result;
}

function toChatStreamChunk(chunk: OllamaApiChatStreamChunk): ChatStreamChunk {
  return chunk;
}

@Injectable()
export class OllamaAdapter implements LlmPort {
  constructor(private readonly ollamaService: OllamaService) {}

  async chat(params: ChatParams): Promise<ChatResult> {
    const result = await this.ollamaService.chat(toOllamaParams(params));
    return toChatResult(result);
  }

  async *chatStream(
    params: ChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamChunk> {
    for await (const chunk of this.ollamaService.chatStream(
      toOllamaParams(params),
      signal,
    )) {
      yield toChatStreamChunk(chunk);
    }
  }

  embed(input: string | string[]): Promise<number[][]> {
    return this.ollamaService.embed(input);
  }

  resolveAvailableModelName(modelName: string): Promise<string | null> {
    return this.ollamaService.resolveAvailableModelName(modelName);
  }
}
