import { ChatParams, ChatResult, ChatStreamChunk } from 'src/domain/ai/llm.types';

export const LLM_PORT = Symbol('LLM_PORT');

export interface LlmPort {
  chat(params: ChatParams): Promise<ChatResult>;
  chatStream(
    params: ChatParams,
    signal?: AbortSignal,
  ): AsyncGenerator<ChatStreamChunk>;
  embed(input: string | string[]): Promise<number[][]>;
  resolveAvailableModelName(modelName: string): Promise<string | null>;
}
