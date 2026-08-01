import {
  OllamaApiChatStreamChunk,
  OllamaChatParams,
  OllamaChatResult,
} from 'src/modules/ollama/types/ollama.types';

export const LLM_PORT = Symbol('LLM_PORT');

export interface LlmPort {
  chat(params: OllamaChatParams): Promise<OllamaChatResult>;
  chatStream(
    params: OllamaChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<OllamaApiChatStreamChunk>;
  embed(input: string | string[]): Promise<number[][]>;
  resolveAvailableModelName(modelName: string): Promise<string | null>;
}
