# Backlog priorizado

Este documento es la fuente canónica del trabajo futuro. El corte de esta
revisión es el `2026-09-01`, sobre `main` en `b9c83d7`. La clasificación se hizo
contrastando el código, los contratos, las migraciones y las pruebas actuales.

## Estado de la base actual

La plataforma ya cuenta con una base funcional para continuar:

- backend NestJS/TypeScript modular, con puertos y adapters;
- aplicación web React/Vite unificada, administración y consola interna;
- autenticación con usuarios, roles, JWT, refresh tokens y dispositivos;
- chat normal y streaming SSE, conversaciones, historial, títulos y resúmenes;
- Centro de Conocimiento con fuentes, versiones, revisión, publicación,
  auditoría, citas y preguntas sin respuesta;
- búsqueda RAG supervisada con PostgreSQL/pgvector y embeddings;
- servicios opcionales de traducción, TTS, STT, trial, idiomas y
  automatizaciones;
- Docker Compose, health checks, logs y métricas.

Esto describe capacidad existente, no significa que todos los flujos estén
unificados ni que la cobertura de seguridad sea completa. `KnowledgeSearchService`
es ahora el camino canónico; `RagService` delega en él y el almacén heredado
queda fuera de la recuperación normal.

## Orden para retomar

| ID | Trabajo | Estado | Dependencia |
| --- | --- | --- | --- |
| BL-01 | Auditoría transversal de RAG y permisos | En progreso: mitigación parcial | Ninguna |
| BL-02 | Unificación de los pipelines de chat | En progreso: RAG HTTP integrado | BL-01 |
| BL-03 | Ampliación de pruebas de políticas y recuperación | No iniciado | BL-01, BL-02 |
| BL-04 | Procesamiento durable de ingesta y embeddings | No iniciado | BL-03 |
| BL-05 | Evaluaciones de calidad de respuestas | No iniciado | BL-01, BL-02 |

El primer slice recomendado es `BL-01`: el riesgo prioritario del producto es
que una ruta de recuperación entregue conocimiento no publicado, vencido o
fuera del permiso del usuario.

## Trabajo planificado y estado de retoma

### BL-01 — Auditar RAG, publicación, vigencia y permisos

- **Estado:** en progreso; publicación, versión, chunk y vigencia ya tienen un
  camino canónico, pero la auditoría de ACL por usuario aún no está cerrada.
- **Workflow:** `docs/ai/workflows/SECURITY_REVIEW.md`.
- **Superficie:** `/api/chat` con RAG, sus streams y perspectivas,
  `/api/chat/rag`, `/api/knowledge/search` y `/api/rag/search`. Se revisa
  aparte `/api/knowledge/test-question`, que está restringido a supervisión y
  puede consultar una fuente antes de publicar.
- **Actores y activos:** usuarios finales, clientes internos autenticados,
  supervisores y administradores; el activo protegido es el texto de chunks,
  sus embeddings, fuentes y citas.
- **Límite de la revisión:** el despliegue se considera aislado por
  instalación; el esquema no tiene todavía ACL por documento o área para
  usuarios individuales.
- **Hallazgo y mitigación:** la ruta heredada consultaba
  `AiDocument`/`AiDocumentChunk`; ahora `RagService` delega en
  `KnowledgeSearchService`, que exige fuente, versión y chunk publicados y
  vigentes. `userId` se propaga para trazabilidad, no para resolver permisos
  de contenido.
- **Alcance mínimo:** inventariar cada ruta RAG y cada caller; definir un único
  contrato de filtros; comprobar área, idioma, publicación, vigencia y rol;
  decidir si el camino heredado se adapta al contrato común o se retira.
- **Aceptación pendiente:** ningún caso de búsqueda o chat recupera
  borradores, rechazados, vencidos o contenido fuera del alcance del usuario;
  existen pruebas negativas para cada filtro; queda registrada la decisión
  sobre la ruta heredada. La parte de publicación, versión, vigencia y ruta
  heredada ya tiene implementación y pruebas; falta decidir y, si aplica,
  modelar ACL por usuario/área.
- **Evidencia esperada:** matriz de rutas, diff de código, pruebas de
  autorización/publicación y resultado del workflow de revisión de seguridad.

### BL-02 — Unificar los pipelines de chat

- **Estado:** en progreso; `/api/chat/rag` ya delega en `ChatService` y el
  servicio paralelo `KnowledgeChatService` fue retirado. Falta cerrar la
  consolidación completa del contrato de streaming RAG.
- **Motivo y avance:** `/api/chat` y sus streams pasan por `ChatService`; ahora
  `/api/chat/rag` también comparte autenticación, política de modelo,
  recuperación, prompt, historial, persistencia, logs y respuesta estricta
  `no_context`. El trial conserva su restricción de no usar RAG.
- **Alcance mínimo:** definir el caso de uso común y conservar las diferencias
  legítimas de autenticación, trial y perspectivas; centralizar recuperación,
  prompt, modelo, streaming SSE, historial, persistencia y auditoría.
- **Aceptación pendiente:** las rutas soportadas deben producir el mismo
  contrato base de respuesta y las mismas políticas de conocimiento; se deben
  conservar fuentes, historial y el estado `no_context`; chat normal, RAG
  HTTP, stream y trial deben tener pruebas de regresión. El HTTP RAG y el
  `no_context` estricto ya están cubiertos; falta probar y, si aplica, exponer
  streaming RAG dedicado.
- **Evidencia esperada:** contrato actualizado, pruebas de integración/E2E,
  eliminación de duplicación y actualización de `ARCHITECTURE.md`.

### BL-03 — Ampliar pruebas de seguridad y comportamiento

- **Estado:** no iniciado.
- **Situación actual:** existen pruebas smoke de auth, chat y publicación, más
  un flujo E2E principal; no hay una batería de pruebas unitarias o de
  integración dedicada a todas las políticas RAG, filtros, errores y estados
  de sesión.
- **Alcance mínimo:** cubrir guards y roles, fuentes no publicadas/vencidas,
  área e idioma, acceso entre usuarios, refresh/logout, errores de Ollama,
  streaming y persistencia parcial.
- **Aceptación:** cada caso negativo relevante tiene una aserción estable;
  las pruebas corren con dobles deterministas para IA y bases aisladas para
  persistencia; el flujo E2E conserva su cobertura actual.
- **Evidencia esperada:** inventario de escenarios, archivos de prueba y
  ejecución de `pnpm test` y del E2E aplicable.

### BL-04 — Incorporar cola durable, reintentos y circuit breakers

- **Estado:** no iniciado.
- **Situación actual:** ingesta y embeddings usan `setImmediate` dentro del
  proceso. Se registran `KnowledgeProcessingJob` y existen hasta dos intentos
  locales para embeddings, pero no hay worker durable, backoff, reclamación de
  trabajos, idempotencia operativa ni circuit breaker para dependencias
  externas.
- **Alcance mínimo:** elegir el mecanismo de cola compatible con la
  infraestructura existente; separar productor/worker; definir reintentos,
  backoff, límites, estados terminales, deduplicación y métricas para
  extracción, embeddings y proveedores externos.
- **Aceptación:** reiniciar el gateway no pierde trabajos; un trabajo no se
  ejecuta dos veces de forma dañina; los fallos transitorios y permanentes se
  distinguen; el sistema evita saturar una dependencia caída y deja auditoría
  operativa.
- **Evidencia esperada:** decisión de arquitectura, migración/configuración
  operativa si fuera necesaria, pruebas de reintento y prueba de recuperación
  tras reinicio.

### BL-05 — Crear evaluaciones de precisión y groundedness

- **Estado:** no iniciado.
- **Situación actual:** el sistema registra búsquedas, respuestas y fuentes,
  pero no existe un dataset versionado ni un proceso que mida precisión,
  groundedness, ausencia de respuesta y alucinaciones.
- **Alcance mínimo:** definir un conjunto pequeño de preguntas representativas,
  respuestas esperadas, fuentes válidas y casos donde la respuesta correcta es
  no responder; comparar resultados antes y después de cambios en recuperación
  y prompts.
- **Aceptación:** las métricas y umbrales están definidos; una ejecución
  reproducible genera resultados sin exponer contenido sensible; una regresión
  de calidad queda visible antes de aceptar cambios de RAG o chat.
- **Evidencia esperada:** contrato del dataset, runner, resultados de una
  primera línea base y actualización de riesgos si aparecen nuevos límites.

## Regla para cerrar un elemento

Cada elemento debe convertirse en una tarea con alcance, criterio de
aceptación, workflow, pruebas, evidencia y actualización documental. No se
marcará como terminado sólo porque exista una clase, una migración o una ruta:
debe comprobarse el comportamiento completo y sus casos negativos.
