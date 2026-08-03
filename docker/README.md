# Docker layout

Archivos de infraestructura:

- `gateway/Dockerfile`: imagen de producción del gateway NestJS.
- `gateway/entrypoint.sh`: ejecuta `prisma migrate deploy` e inicia `node dist/main`.
- `ollama/Dockerfile`: imagen Ollama preparada para ejecutarse sin root.
- `nginx/acoreai-gateway.conf`: proxy público de referencia, con SSE sin buffering.

Los comandos de desarrollo, operación y despliegue se mantienen en el README principal.
