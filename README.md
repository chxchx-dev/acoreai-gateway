# ACoreAI Gateway

Plataforma modular y reutilizable para crear asistentes empresariales conectados a conocimiento privado, controlado y trazable.

ACoreAI no es un chatbot genérico ni un sistema de entrenamiento automático. Es una base para productos que necesitan cargar, revisar, versionar, publicar y consultar conocimiento de una organización mediante IA, conservando permisos, vigencia, fuentes y auditoría.

## Propósito y límites de la plantilla

El repositorio se distribuye como plantilla. El núcleo se mantiene neutral al sector; cada producto derivado aporta su marca, clientes, prompts, reglas de negocio y módulos de dominio.

| Conservar como plataforma | Personalizar por producto | Activar sólo si aplica |
| --- | --- | --- |
| Gateway, autenticación, roles, auditoría, health y métricas | nombre, dominio, logotipo, paleta, textos y prompts | TTS, STT y traducción |
| Chat, conversaciones, streaming, políticas de modelos y observabilidad | áreas de conocimiento, permisos y flujo de aprobación | idiomas, Adventure Mode y perfil educativo |
| Centro de Conocimiento: fuentes, versiones, revisión, publicación, RAG y citas | módulos de dominio y clientes | trial, watchers, correo y automatizaciones |
| PostgreSQL, MongoDB, Prisma, Ollama y Docker | límites, modelos y políticas de retención | servicios adicionales de infraestructura |

Una funcionalidad pertenece al núcleo sólo si conecta un asistente con conocimiento privado, mejora su calidad, vigencia, seguridad o trazabilidad, facilita la supervisión empresarial o se puede reutilizar en varios asistentes. Las demás capacidades deben permanecer aisladas como extensiones opcionales.

## Principios de producto

1. El conocimiento privado es el centro del producto.
2. Toda respuesta empresarial basada en conocimiento debe poder justificarse con sus fuentes.
3. Cargar una fuente no implica publicarla: la revisión humana y la aprobación son pasos explícitos.
4. La versión vigente, la validez temporal, los permisos y la auditoría son reglas de negocio, no detalles de interfaz.
5. La plataforma no aprende autónomamente del contenido cargado ni realiza fine-tuning.
6. La privacidad se protege por entorno, identidad, roles, políticas de acceso y secretos fuera del código.

El ciclo controlado de conocimiento es:

```text
fuente → extracción → versionado → chunking → revisión humana → aprobación
       → embeddings → publicación → recuperación con citas → respuesta fundamentada
```

## Capacidades actuales

- API NestJS en TypeScript estricto, con respuestas completas y streaming SSE.
- Integración con Ollama a través de un adapter HTTP y modelos configurables.
- Autenticación JWT con refresh tokens, Argon2, gestión de dispositivos y roles.
- Conversaciones persistentes, títulos, resúmenes e historial caliente.
- Centro de Conocimiento con fuentes, versiones, chunks, revisiones, publicación, vigencia, auditoría, preguntas sin respuesta y watchers de URL.
- RAG supervisado con PostgreSQL, pgvector, embeddings y citas de fuentes.
- Cliente React/Vite de referencia y panel administrativo React/Vite.
- Métricas Prometheus, logs JSON Pino, `x-request-id`, rate limiting y health checks.
- Servicios opcionales de traducción, texto a voz, voz a texto, trial, idiomas y automatización.
- Despliegue con Docker Compose y Nginx.

## Arquitectura

```text
Cliente de producto       Panel de conocimiento
React / Vite              React / Vite
         \                   /
          \                 /
           └── Gateway NestJS ──┐
                                ├── PostgreSQL + pgvector (verdad y RAG)
                                ├── MongoDB (historial caliente y cachés)
                                ├── Ollama (chat y embeddings)
                                ├── TTS opcional
                                └── STT opcional
```

El backend aplica Arquitectura Hexagonal (Ports & Adapters) dentro de módulos NestJS. Las reglas y los contratos propios no dependen de HTTP, Prisma, MongoDB ni Ollama.

```text
src/
├── domain/            Tipos y reglas de negocio puras
├── application/
│   ├── ports/         Interfaces y tokens de entrada/salida
│   ├── services/      Servicios de aplicación compartidos
│   └── use-cases/     Orquestación real de varios puertos
├── infrastructure/    Adapters de Prisma, MongoDB, Ollama, métricas y correo
├── interfaces/http/   Controllers, DTOs, guards, filtros e interceptores
├── modules/           Composición NestJS por capacidad
├── config/            Configuración y validación de entorno
└── client/            Cliente interno del gateway

web/
├── acoreai/           Cliente de referencia; se reemplaza o personaliza por producto
└── admin/             Administración del Centro de Conocimiento

services/
├── tts/               Servicio FastAPI opcional de texto a voz
└── stt/               Servicio FastAPI opcional de voz a texto

prisma/
├── schema.prisma      Modelo relacional
├── migrations/        Historial de migraciones
└── seeds/             Datos iniciales
```

### Reglas hexagonales

- Un controller depende de un puerto o de un caso de uso, nunca de infraestructura concreta.
- Un adapter traduce entre el contrato del dominio y un proveedor concreto. Cambiar Ollama, Prisma o MongoDB no debe cambiar las reglas de negocio.
- Los puertos de capacidad envuelven integraciones sin estado (`LlmPort`, `TtsPort`, `SttPort`). Los puertos de repositorio ocultan la persistencia de cada agregado.
- Un caso de uso sólo se crea al coordinar varios puertos o contener lógica de aplicación real; el CRUD simple puede delegar directamente en su puerto.
- Un módulo nuevo debe aislar su dominio, contratos, adapter, composición de dependencias y pruebas. No se añaden accesos directos a Prisma/Mongo desde otro módulo.

### Flujo de una petición de chat

```text
cliente → API key interna → JWT / usuario / rol → validación DTO
        → política de modelo → historial → decisión de RAG
        → embedding y búsqueda (si aplica) → prompt → Ollama
        → respuesta o SSE → persistencia, auditoría y métricas
```

El clasificador RAG usa una política conservadora: ante duda o fallo busca contexto. La recuperación sólo considera chunks aprobados, publicados y vigentes; el producto derivado debe añadir filtros de área, idioma y permisos cuando correspondan.

## Datos y conocimiento

| Almacenamiento | Responsabilidad |
| --- | --- |
| PostgreSQL + Prisma | usuarios, sesiones, conversaciones, mensajes, auditoría, fuentes, versiones, revisiones, publicación, automatizaciones y progreso educativo |
| pgvector | embeddings de chunks y búsqueda semántica |
| MongoDB | historial caliente, caché de conversaciones, logs temporales y caché de audio |
| Ollama | generación de texto, clasificación y embeddings; no almacena conocimiento del producto |

La búsqueda semántica calcula similitud coseno y combina similitud, prioridad, frescura y coincidencia de área. Por defecto recupera los mejores resultados y aplica el umbral `RAG_MIN_SCORE`; estos valores se ajustan por producto mediante entorno y se deben evaluar con preguntas reales.

## Stack

| Capa | Tecnología |
| --- | --- |
| Backend | NestJS, TypeScript, Express |
| IA | Ollama |
| Datos | PostgreSQL, Prisma, pgvector, MongoDB |
| Seguridad | JWT, Argon2, Helmet, throttling |
| Clientes | React, Vite, TypeScript, TailwindCSS (admin) |
| Voz | FastAPI, edge-tts, faster-whisper |
| Observabilidad | Pino, Prometheus, prom-client |
| Infraestructura | Docker Compose, Nginx |

## Crear un proyecto derivado

1. Crea una rama o un repositorio desde esta base; asigna un nombre propio a servicios, imágenes, volúmenes Docker y bases de datos. Nunca reutilices claves ni datos de otra instalación.
2. Copia [`.env.example`](.env.example) como `.env` y ajusta secretos, bases de datos, URLs, modelos, administrador y `CORS_ORIGINS`. Para Vite usa también los ejemplos de `web/acoreai/` y `web/admin/`.
3. Define antes de codificar: usuarios, áreas, roles, fuentes permitidas, flujo de aprobación, política de retención, riesgos y métricas de éxito.
4. Personaliza marca, dominio, interfaz y prompts. Agrega las reglas específicas en `src/modules/<dominio>` sin acoplarlas a la infraestructura.
5. Declara qué extensiones se usarán. Si no se necesitan, no las enlaces desde los clientes ni las despliegues. Eliminar una extensión existente requiere revisar migraciones, dependencias y pruebas.
6. Comprueba login, publicación de una fuente y una respuesta RAG con citas antes de construir capacidades adicionales.

## Configuración y ejecución local

### Requisitos

- Node.js 20+
- pnpm
- Docker 24+ y Docker Compose v2
- Ollama local o un servidor de modelos accesible

### Preparación

```bash
cp .env.example .env
pnpm install
cd web/acoreai && npm install
cd ../admin && npm install
cd ../..
```

En Windows, copia los archivos desde el explorador o PowerShell. Nunca confirmes `.env` en Git.

### Desarrollo con Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Servicio | Dirección local |
| --- | --- |
| Cliente de referencia | http://localhost:5175 |
| Panel administrativo | http://localhost:5180 |
| Gateway | http://localhost:4005 |
| Readiness | http://localhost:4005/health/ready |
| Métricas | http://localhost:4005/metrics |

### Desarrollo sin Docker completo

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

Los clientes se ejecutan aparte:

```bash
cd web/acoreai && npm run dev
cd web/admin && npm run dev
```

### Comandos de verificación y operación

```bash
pnpm build
pnpm test
docker compose ps
docker compose logs -f acoreai-gateway
docker compose restart acoreai-gateway
```

El entrypoint de producción aplica `prisma migrate deploy` antes de iniciar el gateway. En producción usa HTTPS y un proxy inverso con soporte SSE; el archivo `docker/nginx/acoreai-gateway.conf` contiene la configuración de referencia.

## API principal

| Área | Endpoints destacados |
| --- | --- |
| Chat | `POST /api/chat`, `POST /api/chat/stream`, `POST /api/chat/perspectives/stream` |
| Conversaciones | `GET /api/conversations`, `GET /api/conversations/:id/messages`, `PATCH /api/conversations/:id/title`, `DELETE /api/conversations/:id` |
| RAG y conocimiento | `POST /api/rag/search`, `POST /api/chat/rag` y endpoints de fuentes, versiones, revisiones, publicación, auditoría y watchers |
| Servicios opcionales | `POST /api/translate`, `POST /api/tts`, `GET /api/tts/voices`, `POST /api/stt` |
| Seguridad | `POST /api/auth/login`, `POST /api/auth/refresh`, `POST /api/auth/logout` |
| Sistema | `GET /health/live`, `GET /health/ready`, `GET /metrics` |

Las rutas protegidas requieren `AI_GATEWAY_KEY` entre servicios y JWT para operaciones de usuario. La clave del gateway nunca debe exponerse en un bundle de producción ni en una variable `VITE_*` pública.

## Seguridad y operación

- Genera claves y contraseñas únicas por entorno; rota credenciales, JWT y administrador al desplegar.
- Define explícitamente `CORS_ORIGINS`; la plantilla permite por defecto sólo `http://localhost:5175` y `http://localhost:5180`.
- Revisa tamaño, MIME, contenido y almacenamiento de cada archivo antes de publicarlo.
- Mantén contenido no aprobado, vencido, sustituido o sin permiso fuera de la recuperación normal.
- Expón PostgreSQL, MongoDB y el gateway sólo en redes necesarias; publica el gateway detrás de HTTPS y Nginx.
- No ejecutes `docker compose down -v` salvo que se quiera eliminar de manera intencional los volúmenes locales.
- Conserva métricas, logs y auditoría; son parte del contrato operacional del producto.

## Estado y siguientes prioridades

La base ya contiene el gateway, RAG supervisado, administración de conocimiento, autenticación, persistencia y adapters de infraestructura. Los siguientes trabajos recomendados son:

1. Unificar los pipelines de chat para que historial, RAG, prompt, streaming y persistencia tengan una sola política.
2. Asegurar filtros de publicación, vigencia, área, idioma y permisos en todas las rutas RAG.
3. Ampliar pruebas unitarias, integración y e2e para políticas, auth, publicación y calidad de recuperación.
4. Incorporar colas, reintentos y circuit breakers para extracción, embeddings y dependencias externas.
5. Medir precisión de recuperación, groundedness y alucinaciones con conjuntos de evaluación reales.
6. Definir almacenamiento de archivos S3-compatible para producción y una política de retención.

No están implementados todavía: fine-tuning, ejecución real de herramientas/function calling, ejecutor de automatizaciones, aprendizaje autónomo desde conversaciones, memoria semántica avanzada ni una suite completa de evaluación de respuestas.

## Licencia

Este proyecto se publica bajo la [Licencia MIT](LICENSE).
