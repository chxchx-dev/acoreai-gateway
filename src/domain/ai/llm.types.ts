export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatParams {
  model: string;
  messages: ChatMessage[];
  keep_alive?: string;
  options?: Record<string, boolean | number | string>;
  stream?: boolean;
  think?: boolean;
}

export interface ChatResult {
  content: string;
  raw: unknown;
}

export interface ChatStreamChunk {
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
