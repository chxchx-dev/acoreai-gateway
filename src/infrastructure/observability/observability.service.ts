import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Gauge,
  Histogram,
  Registry,
} from 'prom-client';

type HttpMethod = string;
type Route = string;
type StatusCode = string;

@Injectable()
export class ObservabilityService implements OnModuleInit {
  readonly registry = new Registry();

  readonly httpRequestsTotal = new Counter({
    name: 'acoreai_ai_gateway_http_requests_total',
    help: 'Total HTTP requests',
    labelNames: ['method', 'route', 'statusCode'] as const,
    registers: [this.registry],
  });

  readonly httpRequestDurationSeconds = new Histogram({
    name: 'acoreai_ai_gateway_http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'route', 'statusCode'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30],
    registers: [this.registry],
  });

  readonly errorsTotal = new Counter({
    name: 'acoreai_ai_gateway_errors_total',
    help: 'Classified application errors',
    labelNames: ['area', 'kind'] as const,
    registers: [this.registry],
  });

  readonly stageDurationSeconds = new Histogram({
    name: 'acoreai_ai_gateway_stage_duration_seconds',
    help: 'Internal stage duration in seconds',
    labelNames: ['stage'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60],
    registers: [this.registry],
  });

  readonly activeStreams = new Gauge({
    name: 'acoreai_ai_gateway_active_streams',
    help: 'Active SSE streams',
    labelNames: ['type'] as const,
    registers: [this.registry],
  });

  readonly ollamaRequestsTotal = new Counter({
    name: 'acoreai_ai_gateway_ollama_requests_total',
    help: 'Ollama requests',
    labelNames: ['operation', 'model', 'status'] as const,
    registers: [this.registry],
  });

  readonly ollamaDurationSeconds = new Histogram({
    name: 'acoreai_ai_gateway_ollama_duration_seconds',
    help: 'Ollama gateway request duration in seconds',
    labelNames: ['operation', 'model'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [this.registry],
  });

  readonly ollamaReportedDurationSeconds = new Histogram({
    name: 'acoreai_ai_gateway_ollama_reported_duration_seconds',
    help: 'Ollama total_duration reported by the model in seconds',
    labelNames: ['operation', 'model'] as const,
    buckets: [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10, 30, 60, 120],
    registers: [this.registry],
  });

  readonly ollamaEvalTokensTotal = new Counter({
    name: 'acoreai_ai_gateway_ollama_eval_tokens_total',
    help: 'Ollama eval tokens from response metadata',
    labelNames: ['model'] as const,
    registers: [this.registry],
  });

  readonly ollamaPromptEvalTokensTotal = new Counter({
    name: 'acoreai_ai_gateway_ollama_prompt_eval_tokens_total',
    help: 'Ollama prompt eval tokens from response metadata',
    labelNames: ['model'] as const,
    registers: [this.registry],
  });

  onModuleInit(): void {
    collectDefaultMetrics({
      register: this.registry,
      prefix: 'acoreai_ai_gateway_',
    });
  }

  observeHttp(
    method: HttpMethod,
    route: Route,
    statusCode: StatusCode,
    durationMs: number,
  ): void {
    const labels = { method, route, statusCode };
    this.httpRequestsTotal.inc(labels);
    this.httpRequestDurationSeconds.observe(labels, durationMs / 1000);
  }

  observeStage(stage: string, durationMs: number): void {
    this.stageDurationSeconds.observe({ stage }, durationMs / 1000);
  }

  async measureStage<T>(stage: string, work: () => Promise<T>): Promise<T> {
    const start = Date.now();
    try {
      return await work();
    } finally {
      this.observeStage(stage, Date.now() - start);
    }
  }

  incrementError(area: string, kind: string): void {
    this.errorsTotal.inc({ area, kind });
  }

  incrementActiveStream(type: string): void {
    this.activeStreams.inc({ type });
  }

  decrementActiveStream(type: string): void {
    this.activeStreams.dec({ type });
  }

  observeOllama(input: {
    operation: string;
    model: string;
    status: 'ok' | 'error';
    durationMs: number;
    totalDurationNs?: number;
    evalCount?: number;
    promptEvalCount?: number;
  }): void {
    this.ollamaRequestsTotal.inc({
      operation: input.operation,
      model: input.model,
      status: input.status,
    });
    this.ollamaDurationSeconds.observe(
      { operation: input.operation, model: input.model },
      input.durationMs / 1000,
    );

    if (input.totalDurationNs && input.totalDurationNs > 0) {
      this.ollamaReportedDurationSeconds.observe(
        { operation: input.operation, model: input.model },
        input.totalDurationNs / 1_000_000_000,
      );
    }

    if (input.evalCount && input.evalCount > 0) {
      this.ollamaEvalTokensTotal.inc({ model: input.model }, input.evalCount);
    }

    if (input.promptEvalCount && input.promptEvalCount > 0) {
      this.ollamaPromptEvalTokensTotal.inc(
        { model: input.model },
        input.promptEvalCount,
      );
    }
  }
}
