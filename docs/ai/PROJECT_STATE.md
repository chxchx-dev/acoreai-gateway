# Estado operativo

- **Producto:** ACoreAI Gateway, plantilla modular para asistentes con
  conocimiento privado y trazable.
- **Backend:** NestJS/TypeScript estricto con arquitectura hexagonal por
  módulos.
- **Persistencia:** PostgreSQL/Prisma/pgvector para verdad y RAG; MongoDB para
  historial caliente y cachés.
- **IA:** Ollama para generación, clasificación y embeddings.
- **Clientes:** aplicación React/Vite unificada con usuario, administración y
  consola interna.
- **Opcionales:** TTS, STT, traducción, idiomas, trial y automatizaciones.
- **Operación:** Docker Compose, Nginx, health checks, logs JSON y métricas
  Prometheus.
- **Riesgo prioritario:** garantizar filtros de permisos y publicación en toda
  recuperación de conocimiento.
- **Verificación base:** `pnpm lint`, `pnpm build`, `pnpm test`, `pnpm doctor` y
  revisión del diff.

Para una tarea, lee sólo este resumen, el workflow aplicable, la regla o
módulo afectado y el rol que corresponda.
