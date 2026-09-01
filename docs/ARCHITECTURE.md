# Arquitectura vigente

ACoreAI Gateway es una plataforma NestJS modular para asistentes conectados a
conocimiento privado, con un cliente React/Vite y servicios opcionales de voz.

```text
cliente web / producto
          ↓
      Gateway NestJS
       ├─ PostgreSQL + Prisma + pgvector  verdad, permisos y RAG
       ├─ MongoDB                         historial caliente y cachés
       ├─ Ollama                          generación y embeddings
       ├─ TTS                             voz opcional
       └─ STT                             transcripción opcional
```

## Límites del backend

- `src/domain`: reglas puras e invariantes del negocio.
- `src/application`: casos de uso, servicios y puertos.
- `src/infrastructure`: adapters de persistencia, IA, métricas y correo.
- `src/interfaces/http`: controllers, DTOs, guards y filtros.
- `src/modules`: composición NestJS por capacidad.
- `src/config`: validación y lectura de configuración del proceso.

Un controller depende de puertos o casos de uso. Un módulo nuevo debe aislar
dominio, contratos, adapters, composición y pruebas; no se accede directamente
a Prisma o MongoDB desde otro módulo.

## Flujo de chat

```text
cliente → autenticación → validación → política de modelo → historial
        → decisión RAG → búsqueda de chunks aprobados/vigentes
        → prompt → Ollama → respuesta/SSE → persistencia y auditoría
```

El despliegue de referencia usa Docker Compose y Nginx. Los servicios
opcionales sólo se conectan cuando el producto los necesita.

## Recuperación RAG canónica

Toda recuperación normal debe pasar por `KnowledgeSearchService`. La consulta
exige un chunk, una versión y una fuente en estado publicado, con fechas de
vigencia válidas; área e idioma se aplican como filtros cuando vienen en el
contrato. `RagService` se conserva como adapter de compatibilidad y delega en
este servicio, por lo que no consulta directamente el almacén heredado.

`KnowledgeTestService` es una excepción controlada para que un supervisor
valide una fuente concreta antes de publicar. No alimenta el chat normal ni la
búsqueda de usuarios finales.

## Pipeline de chat común

`/api/chat`, `/api/chat/stream`, `/api/chat/perspectives/stream` y
`/api/chat/rag` pasan por `ChatService`. El último activa `requireKnowledge`:
  si no hay contexto publicado responde `no_context`, persiste el resultado y
  no cae al modelo general. `sessionId` de esa ruta se reutiliza como
  `conversationId`, de modo que historial, títulos, resúmenes y mensajes viven
  en la misma conversación.
