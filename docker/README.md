# Docker Layout

Archivos de infraestructura Docker/Nginx:

- `gateway/Dockerfile`: imagen de producción del Nest gateway.
- `gateway/entrypoint.sh`: ejecuta `prisma migrate deploy` y arranca `node dist/main`.
- `ollama/Dockerfile`: imagen Ollama fijada y preparada para correr sin root.
- `nginx/olan-ai-gateway.conf`: proxy público del VPS, con SSE sin buffering.

La guía operativa completa vive en `../DEPLOY.md`.
