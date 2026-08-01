import { Injectable } from '@nestjs/common';
import { OllamaService } from 'src/modules/ollama/ollama.service';
import {
  OllamaApiChatStreamChunk,
  OllamaChatParams,
  OllamaChatResult,
} from 'src/modules/ollama/types/ollama.types';
import { LlmPort } from 'src/application/ports/llm.port';

@Injectable()
export class OllamaAdapter implements LlmPort {
  constructor(private readonly ollamaService: OllamaService) {}

  chat(params: OllamaChatParams): Promise<OllamaChatResult> {
    return this.ollamaService.chat(params);
  }

  chatStream(
    params: OllamaChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<OllamaApiChatStreamChunk> {
    return this.ollamaService.chatStream(params, signal);
  }

  embed(input: string | string[]): Promise<number[][]> {
    return this.ollamaService.embed(input);
  }

  resolveAvailableModelName(modelName: string): Promise<string | null> {
    return this.ollamaService.resolveAvailableModelName(modelName);
  }
}
