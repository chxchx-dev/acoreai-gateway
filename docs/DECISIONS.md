# Decisiones de arquitectura y gobierno

## ADR-001 — Gobierno común y configuración fuera del repositorio

- **Estado:** aceptada
- **Fecha:** 2026-08-31
- **Contexto:** el repositorio tenía un playbook genérico y plantillas de
  configuración que podían inducir a copiar secretos o mantener instrucciones
  divergentes entre herramientas.
- **Decisión:** `AGENTS.md` será la entrada común; `docs/` será la fuente
  canónica; los roles y workflows vivirán bajo `docs/ai/`; `CLAUDE.md` sólo
  adaptará las reglas comunes. La configuración privada será responsabilidad
  del entorno de ejecución y no se crearán ni documentarán plantillas locales.
- **Motivo:** reduce ambigüedad, evita duplicación y elimina la posibilidad de
  que ejemplos versionados se interpreten como configuración segura.
- **Consecuencia:** los operadores deben provisionar la configuración fuera
  del repositorio; el doctor comprueba que no reaparezcan plantillas retiradas.

## ADR-002 — Búsqueda RAG supervisada como camino canónico

- **Estado:** aceptada
- **Fecha:** 2026-09-01
- **Contexto:** coexistían dos almacenes y dos caminos de recuperación. El
  camino heredado (`RagService`/`RagStoreService`) podía consultar
  `AiDocument` sin filtros de publicación, vigencia, área, idioma o permisos
  del Centro de Conocimiento.
- **Decisión:** `KnowledgeSearchService` es el camino canónico para toda
  recuperación normal. El adapter de compatibilidad `RagService` delega en él
  y conserva la forma de respuesta existente para `/api/rag/search` y para el
  chat general. La consulta exige fuente, versión y chunk publicados, con
  fechas de vigencia válidas; el identificador del usuario se propaga para
  trazabilidad. `KnowledgeTestService` queda como herramienta controlada de
  supervisión sobre una fuente específica, no como recuperación normal.
- **Motivo:** evita que una ruta heredada eluda el ciclo de aprobación y deja
  una única política técnica de publicación y vigencia.
- **Consecuencia:** `AiDocument`/`RagStoreService` quedan fuera de la
  recuperación normal y podrán retirarse cuando no existan consumidores. El
  área e idioma son filtros de búsqueda, no una ACL por usuario; cualquier
  permiso por documento o área requiere un modelo explícito antes de
  declararse resuelto.

## ADR-003 — Chat RAG sobre el pipeline común

- **Estado:** aceptada
- **Fecha:** 2026-09-01
- **Contexto:** `/api/chat/rag` tenía un servicio propio que no compartía
  conversación, historial, política de modelo ni persistencia de mensajes con
  `/api/chat`.
- **Decisión:** `/api/chat/rag` delega en `ChatService` con `useRag` y
  `requireKnowledge`. Reutiliza autenticación, política de modelo,
  conversación, historial, prompt, persistencia, logs y contrato base de
  chat. `sessionId` conserva compatibilidad y se interpreta como
  `conversationId`. La respuesta mantiene `usedKnowledge` y el formato de
  citas que consume el cliente web.
- **Motivo:** reduce divergencias y evita que el modo RAG genere respuestas
  generales cuando se pidió explícitamente conocimiento aprobado.
- **Consecuencia:** el servicio paralelo `KnowledgeChatService` se retira. La
  siguiente iteración puede exponer streaming RAG dedicado si hace falta; el
  streaming general ya usa el mismo `ChatService` y puede activar RAG.
