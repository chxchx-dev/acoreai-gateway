# Arquitectura de datos: historial vs. conocimiento

> Fecha: 2026-07-03
> Contexto: el usuario pidió separar "dos tipos de DB" — una de historial/logs de
> prompts (descargable en CSV/Excel) y otra de conocimiento reforzado (la base del RAG).
> Este documento explica lo que ya existía, lo que se agregó, y la estructura completa
> de ambas bases tal como quedaron.

---

## 1. Resumen: la separación ya existía

`acoreai-gateway` ya corría con **dos bases de datos físicamente separadas** desde antes
de esta tarea. Lo que faltaba era (a) que el chat del RAG también escribiera en la base
de historial, y (b) una forma de descargar ese historial para análisis. Eso es lo que
se construyó hoy.

```txt
┌─────────────────────────────┐        ┌──────────────────────────────────┐
│   PostgreSQL + pgvector     │        │            MongoDB                │
│   "Base de conocimiento"    │        │        "Base de historial"        │
│                              │        │                                    │
│  KnowledgeSource             │        │  chat_logs        (prompts/respuestas)
│  KnowledgeSourceVersion      │        │  conversations     (chat general)  │
│  KnowledgeChunk (+embedding) │        │  ai_profiles       (perfil IA)     │
│  KnowledgeReview             │        │  trial_usage       (límites trial) │
│  KnowledgeProcessingJob      │        │                                    │
│  KnowledgeAuditLog           │        │  Append-only, con TTL, pensada     │
│  KnowledgeSearchLog          │        │  para volumen alto y exportación,  │
│  KnowledgeAnswerSource       │        │  no para integridad relacional.   │
│  KnowledgeWatcher            │        │                                    │
│                              │        │                                    │
│  Relacional, con FKs,        │        │                                    │
│  transacciones, vectores.    │        │                                    │
│  Es la fuente de verdad      │        │                                    │
│  de lo que el chat puede     │        │                                    │
│  usar para responder.        │        │                                    │
└─────────────────────────────┘        └──────────────────────────────────┘
```

**Regla de separación:**

- **Postgres** = conocimiento curado y gobernado (lo que entra al pipeline
  `carga → revisión → aprobación → embeddings → publicación`). Es lo único que el
  chat puede citar como fuente. Chico en volumen, pero crítico en integridad.
- **MongoDB** = historial de interacciones (cada pregunta que entra al sistema, con
  su respuesta, modelo, fuentes citadas y latencia). Alto volumen, sin necesidad de
  relaciones estrictas, ideal para exportar y analizar fuera del sistema.

---

## 2. Qué se hizo hoy

1. **`/chat/rag` y `/knowledge/test-question` ahora escriben en `chat_logs` (Mongo)**,
   la misma colección que ya usaba el chat general de la plataforma
   (`src/modules/logs/logs.service.ts`). Antes, una pregunta al RAG solo dejaba
   rastro en `knowledge_search_logs` (Postgres), que no guarda el texto de la
   respuesta — quedaba invisible para `/api/logs`.
2. **Endpoint de exportación** `GET /api/logs/export?format=csv|xlsx` (solo ADMIN),
   con filtros por `source`, `status`, `from`, `to`. Genera el archivo al vuelo
   (CSV a mano, Excel con la librería `exceljs`) y lo entrega como descarga.
3. **Panel "Historial de prompts" en el Dashboard** del Centro de Conocimiento, con
   selector de origen/fechas y dos botones de descarga.
4. Bug encontrado y corregido en el camino: el import de `exceljs` fallaba en
   producción (`Cannot read properties of undefined (reading 'Workbook')`) porque
   el proyecto no tiene `esModuleInterop` activado — se corrigió usando
   `import * as ExcelJS from 'exceljs'` en vez de `import ExcelJS from 'exceljs'`.

### Qué no se tocó

- El esquema de Postgres del conocimiento (`Knowledge*`) no cambió.
- No se creó una tercera base de datos ni se movió nada existente.
- `/knowledge/search` (búsqueda vectorial cruda, sin generación) no se logueó en
  `chat_logs` porque no llama al LLM — no es un "prompt", es una búsqueda.

---

## 3. Base de conocimiento (PostgreSQL + pgvector)

Todas las tablas viven en el mismo Postgres que el resto de la plataforma
(`DATABASE_URL`), definidas en `prisma/schema.prisma`. Sin `tenant_id`: ACoreAI y
ACoreAI corren en gateways separados, así que no aplica multi-tenant.

### Estados (enums)

```txt
KnowledgeSourceStatus:
  draft, pending_extraction, extracted, chunked, pending_review, needs_changes,
  approved, embedding_pending, embedding_failed, ready_to_publish, published,
  rejected, archived, expired

KnowledgeChunkStatus:
  draft, pending_review, approved, rejected, published, archived, expired

KnowledgeJobType:
  extract_text, chunk_text, generate_embeddings, detect_duplicates,
  compare_versions, validate_expiration

KnowledgeJobStatus:
  queued, running, completed, failed, cancelled

KnowledgeReviewDecision:
  approved, rejected, needs_changes

KnowledgeRole (independiente del UserRole general de la plataforma):
  SUPER_ADMIN, TENANT_ADMIN, KNOWLEDGE_SUPERVISOR, KNOWLEDGE_UPLOADER,
  AUDITOR, CHAT_USER
```

### `KnowledgeSource` — la fuente (documento/texto/URL)

| Campo | Tipo | Notas |
|---|---|---|
| `id` | uuid | |
| `title`, `description` | string | |
| `sourceType` | string | `text` \| `upload` \| `url` (url reservado para Fase 8) |
| `area`, `language` | string? | filtros de retrieval |
| `priority` | int (0–100) | pondera el ranking de búsqueda |
| `status` | `KnowledgeSourceStatus` | máquina de estados del pipeline |
| `fileUrl`, `originalFilename`, `mimeType`, `checksum` | string? | metadata de archivo / dedupe |
| `currentVersion` | int | se incrementa al crear una nueva versión (Fase 8) |
| `validFrom`, `validUntil` | date? | vigencia; filtra qué puede responder el chat |
| `uploadedBy`, `reviewedBy`, `publishedBy` | string? (userId) | trazabilidad |
| `reviewedAt`, `publishedAt`, `archivedAt` | datetime? | |

Relaciones: `versions[]`, `chunks[]`, `reviews[]`, `processingJobs[]`, `watchers[]`.

### `KnowledgeSourceVersion` — historial de contenido de una fuente

Cada re-carga de contenido sobre una fuente existente (Fase 8) crea una fila nueva
aquí, sin borrar la anterior. `version` es incremental por fuente.

| Campo | Notas |
|---|---|
| `extractedText`, `textHash` | texto crudo extraído + su checksum |
| `changeSummary` | reservado para resumen de cambios asistido por IA (no implementado aún) |
| `status` | mismo enum que la fuente, refleja el pipeline de *esta* versión |

### `KnowledgeChunk` — la unidad real que el chat recupera

| Campo | Notas |
|---|---|
| `sourceId`, `versionId` | a qué fuente/versión pertenece |
| `chunkIndex` | orden dentro de la versión |
| `content`, `sectionTitle` | texto del chunk + título de sección (markdown `#`) |
| `embedding` | `vector(768)` (pgvector), `Unsupported` en Prisma — se escribe/lee con `$queryRaw` |
| `embeddingModel` | modelo usado (`embeddinggemma`) — nunca se mezclan dimensiones |
| `status` | `KnowledgeChunkStatus` — **`published` es la única fuente de verdad para retrieval** |
| `tokensCount`, `priority`, `validFrom`, `validUntil` | igual que la fuente, a nivel de chunk |
| `approvedBy`, `approvedAt`, `publishedAt` | trazabilidad |

**Regla de oro (verificada en Fase 8):** la búsqueda (`knowledge-search.service.ts`)
filtra únicamente por `chunk.status = 'published'`. No depende del estado de la
fuente — así, cuando se sube una nueva versión de una fuente ya publicada, los
chunks viejos (todavía `published`) siguen respondiendo mientras la nueva versión
pasa por revisión.

### `KnowledgeReview` — decisión humana

`decision` (`approved`/`rejected`/`needs_changes`), `comments`, `checklist` (JSONB
libre), `reviewerId`. Una fila por cada vez que un supervisor revisa una versión.

### `KnowledgeProcessingJob` — cola de trabajo (sin Redis todavía)

Registra cada paso asíncrono: `extract_text`, `chunk_text`, `generate_embeddings`.
Hoy corre in-process (`setImmediate`, ver `knowledge-ingestion.service.ts` y
`knowledge-embeddings.service.ts`) — el modelo de datos ya está listo para migrar a
BullMQ/Redis sin cambiar el esquema.

### `KnowledgeAuditLog` — auditoría genérica

`entityType` + `entityId` + `action` (`source.created`, `source.approved`,
`chunk.edited`, `watcher.change_detected`, `chat.answered`, etc.) + `oldValue`/
`newValue` (JSON) + `userId`/`ipAddress`/`userAgent`. Todo lo que pasa en el
Centro de Conocimiento queda acá — es la auditoría *de gobierno*, no el historial
de conversación (eso vive en Mongo, ver sección 4).

### `KnowledgeSearchLog` / `KnowledgeAnswerSource`

- `KnowledgeSearchLog`: una fila por cada búsqueda vectorial (`query`, `filters`,
  `topK`, `resultCount`, `latencyMs`). Sirve para la pantalla "Preguntas sin
  respuesta" (`resultCount = 0`).
- `KnowledgeAnswerSource`: qué chunks se citaron en una respuesta de chat
  (`chatMessageId`, `sourceId`, `chunkId`, `score`). Es el detalle fino de
  citación; el texto completo de la conversación vive en Mongo.

### `KnowledgeWatcher` — actualización controlada (Fase 8)

`sourceId` (a qué fuente actualiza), `targetUrl`, `scheduleCron`, `lastChecksum`,
`status` (`active`/`paused`). Nunca publica — solo dispara
`KnowledgeSourcesService.createNewVersion()`, que deja la fuente en
`pending_review`. Protegido con allowlist de dominios
(`KNOWLEDGE_WATCHER_ALLOWED_DOMAINS`) y bloqueo de IPs privadas/metadata de nube.

### `User.knowledgeRole`

Campo opcional agregado en Fase 7 sobre el modelo `User` ya existente. Los
usuarios con `role = ADMIN` (el rol general de la plataforma) siguen teniendo
acceso total al Centro de Conocimiento sin necesitar este campo — es
retrocompatible. Ver matriz de permisos en
`07_FASE_7_SEGURIDAD_ROLES_AUDITORIA.md`.

---

## 4. Base de historial (MongoDB)

Vive en `MONGODB_URI`, ya usada por el resto de la plataforma. Colección relevante:

### `chat_logs`

```ts
{
  id: string;              // uuid propio, no el _id de Mongo
  userId?: string;
  conversationId?: string; // solo lo usa el chat general, no el RAG
  source?: string;         // discriminador: de dónde vino el prompt
  question: string;
  answer?: string | null;
  model: string;
  status: string;          // 'answered' | 'no_context' | 'no_model' | 'error' | ...
  errorMessage?: string;
  durationMs?: number;
  chunksUsed: number;
  sources?: unknown;       // JSON: fuentes/chunks citados (si aplica)
  createdAt: Date;
}
```

**Valores de `source` en uso:**

| `source` | Quién lo escribe | Qué es |
|---|---|---|
| `rag_chat` | `KnowledgeChatService.ask()` | pregunta real al chat del RAG (`/chat/rag`) |
| `rag_test` | `KnowledgeTestService.testQuestion()` | prueba de pregunta antes de publicar |
| `acoreai-web`, `acoreai-web`, `acoreai-system`, etc. | `ChatService` (chat general) | conversación del producto ACoreAI/ACoreAI, no relacionada al RAG |

Índices ya existentes: `id` (único), `userId+createdAt`, `conversationId+createdAt`,
`status+createdAt`, `source+createdAt`.

### Exportación

`GET /api/logs/export?format=csv|xlsx&source=&status=&userId=&from=&to=`
(solo `role = ADMIN`). Tope de 50.000 filas por exportación
(`src/modules/logs/logs.service.ts#exportLogs`). Genera el archivo en memoria
(`src/modules/logs/export.util.ts`) y lo entrega con
`Content-Disposition: attachment`.

---

## 5. Dónde tocar cada cosa

| Quiero... | Archivo |
|---|---|
| Agregar un campo al historial exportable | `export.util.ts` (columnas) + `MongoChatLogDocument` en `mongodb.service.ts` |
| Cambiar qué se considera "usable por el chat" | `knowledge-search.service.ts` (WHERE de la query vectorial) |
| Agregar un rol nuevo del Centro de Conocimiento | `domain/knowledge/knowledge-role.ts` + `knowledge-permissions.ts` |
| Sumar un tipo de fuente automatizable (Drive, OneDrive...) | `modules/knowledge/watchers/` (hoy solo soporta `url`) |
| Cambiar el modelo de embeddings | `OLLAMA_EMBEDDING_MODEL` + migrar dimensión del `vector()` si cambia |
