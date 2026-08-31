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
