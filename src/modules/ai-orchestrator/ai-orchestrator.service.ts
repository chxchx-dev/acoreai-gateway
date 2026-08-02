import { Inject, Injectable } from '@nestjs/common';
import {
  OllamaHealthResult,
  OllamaAvailableModelsResponse,
} from 'src/modules/ollama/types/ollama.types';
import { LLM_PORT, LlmPort } from 'src/application/ports/llm.port';
import { ChatParams, ChatResult, ChatStreamChunk } from 'src/domain/ai/llm.types';
import { OllamaService } from 'src/modules/ollama/ollama.service';

@Injectable()
export class AiOrchestratorService {
  constructor(
    @Inject(LLM_PORT)
    private readonly llm: LlmPort,
    private readonly ollamaService: OllamaService,
  ) {}

  generate(params: ChatParams): Promise<ChatResult> {
    return this.llm.chat(params);
  }

  generateStream(
    params: ChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamChunk> {
    return this.llm.chatStream(params, signal);
  }

  createEmbedding(input: string | string[]): Promise<number[][]> {
    return this.llm.embed(input);
  }

  resolveModel(modelName: string): Promise<string | null> {
    return this.llm.resolveAvailableModelName(modelName);
  }

  checkInferenceHealth(): Promise<OllamaHealthResult> {
    return this.ollamaService.checkHealth();
  }

  listModels(forceRefresh = false): Promise<OllamaAvailableModelsResponse> {
    return this.ollamaService.listAvailableModels(forceRefresh);
  }
}
