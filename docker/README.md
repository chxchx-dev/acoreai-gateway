# Docker layout

Archivos de infraestructura:

- `gateway/Dockerfile`: imagen de producción del gateway NestJS.
- `gateway/entrypoint.sh`: ejecuta `prisma migrate deploy` e inicia `node dist/main`.
- `e2e/Dockerfile`: imagen de validación con dependencias backend/frontend y cliente Prisma.
- `ollama/Dockerfile`: imagen Ollama preparada para ejecutarse sin root.
- `nginx/acoreai-gateway.conf`: proxy público de referencia, con SSE sin buffering.

`docker-compose.test.yml` monta el stack aislado de PostgreSQL, MongoDB y QA para ejecutar `pnpm test:e2e` o `pnpm verify:docker`.

Los comandos de desarrollo, operación y despliegue se mantienen en el README principal.
