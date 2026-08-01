import { Injectable, Logger } from '@nestjs/common';
import { AiOrchestratorService } from 'src/modules/ai-orchestrator/ai-orchestrator.service';

const CLASSIFIER_MODEL = 'llama3.2:1b';
const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX_ENTRIES = 500;

const CLASSIFIER_SYSTEM_PROMPT = `Eres un clasificador. Tu única tarea es decidir si, para responder la pregunta del usuario, hace falta buscar en una base de conocimiento institucional (políticas, cursos, reglamentos, datos específicos de la institución).

Responde con UNA sola palabra: SI o NO. Nada más, sin explicaciones.

Ejemplos:
Pregunta: "hola, ¿cómo estás?"
Respuesta: NO

Pregunta: "¿cuáles son los requisitos de matrícula?"
Respuesta: SI

Pregunta: "gracias, eso es todo"
Respuesta: NO

Pregunta: "¿qué política aplica si llego tarde a un examen?"
Respuesta: SI

Pregunta: "explícame qué es una fracción"
Respuesta: NO

Pregunta: "¿cuál es el horario de la biblioteca?"
Respuesta: SI`;

// No hay clasificador de intención real hoy: el chat decide si busca en el
// RAG solo por un flag que manda el cliente (dto.useRag). Este servicio lo
// reemplaza con una decisión propia del sistema cuando el cliente no fuerza
// el flag explícitamente (ver ChatService.resolveUseRag).
@Injectable()
export class IntentClassifierService {
  private readonly logger = new Logger(IntentClassifierService.name);
  private readonly cache = new Map<string, { value: boolean; expiresAt: number }>();

  constructor(private readonly aiOrchestrator: AiOrchestratorService) {}

  async classify(question: string): Promise<boolean> {
    const key = question.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const needsRag = await this.runClassification(question);
    this.remember(key, needsRag);
    return needsRag;
  }

  private async runClassification(question: string): Promise<boolean> {
    try {
      const model = (await this.aiOrchestrator.resolveModel(CLASSIFIER_MODEL)) ?? CLASSIFIER_MODEL;
      const result = await this.aiOrchestrator.generate({
        model,
        messages: [
          { role: 'system', content: CLASSIFIER_SYSTEM_PROMPT },
          { role: 'user', content: question },
        ],
        options: { temperature: 0, num_predict: 5 },
      });

      const answer = result.content.trim().toUpperCase();
      if (answer.startsWith('SI') || answer.startsWith('YES') || answer.startsWith('RAG')) return true;
      if (answer.startsWith('NO') || answer.startsWith('DIRECT')) return false;

      // Respuesta ambigua del modelo: más seguro buscar contexto de más que
      // responder sin él y quedar corto.
      this.logger.warn(`Clasificación de intención ambigua ("${answer}"), default a needsRag=true`);
      return true;
    } catch (err: unknown) {
      this.logger.warn(
        `Fallo clasificando intención, default a needsRag=true: ${err instanceof Error ? err.message : String(err)}`,
      );
      return true;
    }
  }

  private remember(key: string, value: boolean): void {
    if (this.cache.size >= CACHE_MAX_ENTRIES) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  }
}
