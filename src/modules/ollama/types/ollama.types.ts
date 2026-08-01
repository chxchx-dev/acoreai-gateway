export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatParams {
  model: string;
  messages: OllamaMessage[];
  keep_alive?: string;
  options?: Record<string, boolean | number | string>;
  stream?: boolean;
  think?: boolean;
}

export interface OllamaChatResult {
  content: string;
  raw: unknown;
}

export interface OllamaApiChatResponse {
  model: string;
  created_at: string;
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaApiChatStreamChunk {
  model?: string;
  created_at?: string;
  message?: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaModel {
  name: string;
  modified_at: string;
  size: number;
}

export interface OllamaListModelsResponse {
  models: OllamaModel[];
}

export interface OllamaAvailableModel {
  name: string;
  label: string;
  size: number;
  modifiedAt: string;
}

export interface OllamaAvailableModelsResponse {
  models: OllamaAvailableModel[];
  modelNames: string[];
}

export interface OllamaEmbedResponse {
  model: string;
  embeddings: number[][];
}

export interface OllamaHealthResult {
  status: 'ok' | 'error';
  baseUrl?: string;
  model?: string;
  message?: string;
}
