# Estado operativo

## Corte actual

- **Fecha:** 2026-09-01.
- **Rama/commit:** `main` / `b9c83d7` + cambios locales del bloque activo.
- **Producto:** ACoreAI Gateway, plataforma modular para asistentes con
  conocimiento privado y trazable.

## Resumen para retomar

La base funcional está construida: backend NestJS/TypeScript con límites
hexagonales, cliente React/Vite unificado, autenticación, conversaciones,
Centro de Conocimiento supervisado, RAG con pgvector, Ollama, servicios
opcionales de voz/traducción/idiomas/trial/automatizaciones y verificación en
Docker.

El trabajo futuro no está desglosado en código como una sola iniciativa. El
detalle canónico está en [docs/BACKLOG.md](../BACKLOG.md), con estados y
criterios de aceptación. Los elementos pendientes siguen sin implementación
completa:

1. `BL-01`: auditar todas las rutas RAG y permisos (en progreso; mitigación
   parcial aplicada).
2. `BL-02`: unificar los pipelines de chat (en progreso; RAG HTTP integrado).
3. `BL-03`: ampliar pruebas de políticas, auth y recuperación.
4. `BL-04`: agregar cola durable, reintentos y circuit breakers.
5. `BL-05`: crear evaluaciones de calidad y groundedness.

## Hallazgo que define la prioridad

La recuperación supervisada de `KnowledgeSearchService` exige fuente, versión y
chunk publicados y vigentes, además de filtros de área e idioma. El camino
heredado de `RagService` ya delega en ese buscador; falta decidir si el producto
necesita ACL por usuario/área, porque el `userId` actual sirve para trazabilidad
y no representa por sí solo un permiso de contenido.

El endpoint `/api/chat/rag` ya comparte `ChatService` con el chat normal,
incluyendo conversación, historial, política de modelo y persistencia. El
trabajo pendiente de este bloque es cerrar la cobertura y el contrato de
streaming RAG.

## Verificación del corte

- `pnpm doctor`: OK.
- `pnpm lint`: OK; quedan ocho warnings existentes del frontend y el entorno
  declara Node 24 frente a Node 20 del frontend.
- `pnpm build`: OK para backend y frontend.
- `pnpm test`: arranca, pero requiere las variables privadas del runtime y sus
  servicios Postgres/Mongo/Ollama; sin ellas falla la validación de configuración
  antes de ejecutar las pruebas.
- `git diff --check`: OK en este corte.
