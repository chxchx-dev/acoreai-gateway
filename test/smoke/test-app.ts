import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from 'src/app.module';
import { LLM_PORT, LlmPort } from 'src/application/ports/llm.port';

/**
 * Los tests de humo bootstrapean el AppModule completo contra Postgres/Mongo
 * de prueba reales (ver test/setup-env.ts) — solo se sustituye LLM_PORT
 * porque un LLM real (Ollama) no es determinista ni está garantizado en el
 * entorno donde corren los tests. Todo lo demás (persistencia, DTOs,
 * políticas) se ejerce tal cual corre en producción.
 */
export function createFakeLlmPort(): LlmPort {
  const fixedEmbedding = new Array(768).fill(0.01);

  return {
    async chat() {
      return { content: 'Respuesta de prueba', raw: {} };
    },
    async *chatStream() {
      yield { done: true, message: { role: 'assistant', content: 'Respuesta de prueba' } };
    },
    async embed(input: string | string[]) {
      const count = Array.isArray(input) ? input.length : 1;
      return Array.from({ length: count }, () => [...fixedEmbedding]);
    },
    async resolveAvailableModelName(modelName: string) {
      return modelName;
    },
  };
}

export async function createTestApp(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(LLM_PORT)
    .useValue(createFakeLlmPort())
    .compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}
