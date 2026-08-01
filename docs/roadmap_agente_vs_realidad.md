# Roadmap conceptual del agente vs. pipeline real

> Fecha: 2026-07-06
> Objetivo: comparar el flujo conceptual de un "agente/orquestador" contra lo que el código de `olan-ai-gateway` hace hoy, y dejar registrado qué falta para cerrar la brecha.

## Roadmap conceptual evaluado

```
Usuario
  ↓
Agente / Orquestador
  ↓
Clasifica intención
  ↓
Busca contexto en RAG si hace falta
  ↓
Construye prompt con:
  - instrucciones del sistema
  - datos recuperados
  - historial relevante
  - herramientas disponibles
  ↓
Modelo fine-tuned
  ↓
Respuesta / acción / llamada a herramienta
```

## Contexto: dos pipelines paralelos

Existen dos pipelines de chat **distintos e inconsistentes entre sí**:

- **`ChatService`** (`src/modules/chat/chat.service.ts`) — el chat principal, con historial de conversación y RAG **opcional** (controlado por un flag `useRag` que manda el cliente).
- **`KnowledgeChatService`** (`src/modules/knowledge/retrieval/knowledge-chat.service.ts`), expuesto en `src/interfaces/http/controllers/chat-rag.controller.ts` — sin historial, con RAG **siempre obligatorio**.

El roadmap conceptual solo se aproxima al primero (`ChatService`).

## Paso a paso: qué existe y qué no

| # | Paso del roadmap | Estado | Detalle |
|---|---|---|---|
| 1 | Usuario pregunta | ✅ Existe tal cual | `ChatService.ask()`/`.stream()` reciben `ChatRequest.question` (`chat.service.ts:56,80`). `ChatRagController.ask()` recibe `dto.message` (`chat-rag.controller.ts:21`). |
| 2 | Agente / Orquestador | ⚠️ Existe el nombre, no el rol | `AiOrchestratorService` (`src/modules/ai-orchestrator/ai-orchestrator.service.ts:12-46`) es una fachada delgada sobre `LlmPort`/`OllamaService` (`generate`, `generateStream`, `createEmbedding`, `resolveModel`). No decide nada, no rutea, no orquesta — es infraestructura, no un cerebro. |
| 3 | Clasifica intención | ❌ No existe | No hay ningún clasificador de intención (`grep` de `intent\|classify\|clasificar\|router` en `src/modules` no da nada relevante al chat). Usar RAG o no es un booleano (`dto.useRag`) que decide el **cliente**, no una clasificación hecha por el sistema. |
| 4 | Busca en RAG *si hace falta* (condicional) | ⚠️ Parcial y distinto | En `ChatService`: condicional al flag `useRag` (`chat.service.ts:74-77,760-792`) — no es una decisión autónoma. En `KnowledgeChatService`/`/chat/rag`: la búsqueda es **siempre obligatoria** (`knowledge-chat.service.ts:40-45`); si no hay resultados con score ≥ `RAG_MIN_SCORE` (default 0.35, `knowledge-search.service.ts:49`), responde un `NO_CONTEXT_ANSWER` fijo. |
| 5 | Construye prompt (system + RAG + historial + **herramientas**) | ⚠️ Parcial | `PromptBuilderService.withConversationHistory()` (`src/application/services/prompt-builder.service.ts:5-33`) sí combina system prompt + resumen de conversación + historial reciente + system prompt custom opcional. El contexto RAG se inyecta en un placeholder `{{context}}` (`chat.service.ts:590-593,794-797`) o vía `buildRagSystemPrompt()` (`prompt.util.ts:1-22`). **"Herramientas disponibles" no existe**: cero arrays `tools`/`function_call` en ningún request al modelo (grep exhaustivo sin resultados). |
| 6 | Modelo fine-tuned | ❌ Falso | No hay ningún fine-tuning (`grep "fine-tun"` sin resultados). Son modelos **base** de Ollama: `qwen3:4b`, `llama3.2:3b`, `llama3.1:8b`, `llama3:8b` (`src/modules/ollama/ollama.service.ts:19-28`, `src/domain/ai/policies/chat-policy.ts:54-70`). Todo el comportamiento "especializado" es prompt engineering, no entrenamiento. |
| 7 | Respuesta / acción / tool call | ⚠️ Parcial | Solo devuelve texto (normal o streaming, `chat.service.ts:166-184,516,626`). No hay acciones estructuradas ni tool calls — no hay nada que parsear porque nunca se le ofrecen tools al modelo (`OllamaChatResult`/`OllamaApiChatStreamChunk` no tienen ese campo). |

## Detalle adicional: historial de conversación

El historial **no se envía completo**, pero tampoco se selecciona por relevancia semántica como sugiere "historial relevante": se trunca por tamaño (`buildHistoryBlock`, `conversations.service.ts:437-460`, límites `maxHistoryChars`/`maxMessageChars`) y hay un resumen (`summary`) generado de forma asíncrona por el mismo LLM para conversaciones largas (`chat.service.ts:830-883`). Es un truncamiento simple, no una selección de relevancia.

## Brechas priorizadas (qué falta para cumplir el roadmap)

1. **Clasificador de intención real** — hoy no existe; la decisión de usar RAG es un flag externo, no una inferencia del sistema.
2. **Búsqueda RAG verdaderamente condicional** — unificar el comportamiento entre `ChatService` y `KnowledgeChatService` (uno es opcional-por-flag, el otro obligatorio-siempre); ninguno decide "si hace falta" de forma autónoma.
3. **Soporte de herramientas / function calling** — no existe en absoluto, ni en tipos ni en runtime.
4. **Unificar los dos pipelines de chat** — hoy son incoherentes entre sí (con/sin historial, RAG opcional/obligatorio), lo cual complica cualquier mejora futura si se hace en un solo lugar.
5. **Fine-tuning** — fuera de alcance de una implementación de código; requiere datos etiquetados, infraestructura de entrenamiento y evaluación. Se puede mitigar (no reemplazar) con mejor prompt engineering + RAG + few-shot, pero no es lo mismo.
6. **Selección de historial por relevancia semántica** (opcional/menor) — hoy es truncamiento por tamaño, no por relevancia; mejora de calidad, no bloqueante.
