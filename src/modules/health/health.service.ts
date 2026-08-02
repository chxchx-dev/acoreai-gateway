import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';
import { MongoService } from 'src/infrastructure/database/mongodb/mongodb.service';
import { PrismaService } from 'src/infrastructure/database/prisma/prisma.service';

type HealthState = 'ok' | 'degraded' | 'error';

export interface DependencyHealth {
  status: HealthState;
  latencyMs: number;
  message?: string;
}

export interface HealthStatus {
  status: HealthState;
  service: string;
  timestamp: string;
  checks?: Record<string, DependencyHealth>;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mongo: MongoService,
    private readonly aiOrchestrator: AiOrchestratorService,
    private readonly config: ConfigService,
  ) {}

  live(): HealthStatus {
    return {
      status: 'ok',
      service: 'acoreai-gateway',
      timestamp: new Date().toISOString(),
    };
  }

  async ready(): Promise<HealthStatus> {
    const checks = {
      postgres: await this.checkPostgres(),
      mongodb: await this.checkMongo(),
      ollama: await this.checkOllama(),
      tts: await this.checkHttpService(
        'tts',
        this.config.get<string>('TTS_SERVICE_URL', 'http://tts-service:8880'),
      ),
      stt: await this.checkHttpService(
        'stt',
        this.config.get<string>('STT_SERVICE_URL', 'http://stt-service:9000'),
      ),
    };

    return this.withChecks(checks);
  }

  async deep(): Promise<HealthStatus> {
    const checks = {
      ...(await this.ready()).checks,
      ollamaModels: await this.timed('ollamaModels', async () => {
        const { modelNames } = await this.aiOrchestrator.listModels(true);
        if (modelNames.length === 0) {
          throw new Error('No hay modelos cargados en Ollama');
        }
      }),
      embeddings: await this.timed('embeddings', async () => {
        const embeddings = await this.aiOrchestrator.createEmbedding('health check');
        if (!embeddings[0]?.length) {
          throw new Error('El modelo de embeddings no devolvió vector');
        }
      }),
    };

    return this.withChecks(checks);
  }

  private async checkPostgres(): Promise<DependencyHealth> {
    return this.timed('postgres', async () => {
      await this.prisma.$queryRaw`SELECT 1`;
    });
  }

  private async checkMongo(): Promise<DependencyHealth> {
    return this.timed('mongodb', async () => {
      await this.mongo.ping();
    });
  }

  private async checkOllama(): Promise<DependencyHealth> {
    return this.timed('ollama', async () => {
      const health = await this.aiOrchestrator.checkInferenceHealth();
      if (health.status !== 'ok') {
        throw new Error(health.message ?? 'Ollama no disponible');
      }
    });
  }

  private async checkHttpService(
    name: string,
    baseUrl: string,
  ): Promise<DependencyHealth> {
    return this.timed(name, async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(`${baseUrl}/health`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
      } finally {
        clearTimeout(timer);
      }
    });
  }

  private async timed(
    name: string,
    check: () => Promise<void>,
  ): Promise<DependencyHealth> {
    const start = Date.now();
    try {
      await check();
      return { status: 'ok', latencyMs: Date.now() - start };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Health check ${name} falló: ${message}`);
      return {
        status: 'error',
        latencyMs: Date.now() - start,
        message,
      };
    }
  }

  private withChecks(
    checks: Record<string, DependencyHealth | undefined>,
  ): HealthStatus {
    const normalized = Object.fromEntries(
      Object.entries(checks).filter(
        (entry): entry is [string, DependencyHealth] => Boolean(entry[1]),
      ),
    );
    const hasError = Object.values(normalized).some(
      (check) => check.status === 'error',
    );

    return {
      status: hasError ? 'error' : 'ok',
      service: 'acoreai-gateway',
      timestamp: new Date().toISOString(),
      checks: normalized,
    };
  }
}
