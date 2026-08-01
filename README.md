# OLAN AI Gateway

Microservicio NestJS que actúa como capa de inteligencia artificial de la plataforma Olan. Centraliza el acceso a modelos de lenguaje remotos (Ollama en servidor dedicado), historial de conversaciones, búsqueda semántica (RAG), texto a voz, voz a texto y traducción — todo en un solo servicio con dos interfaces web incluidas.

---

## Dos plataformas, un gateway

```
                    ┌─────────────────────────────────┐
                    │       olan-ai-gateway            │
                    │                                  │
   Plataforma OLAN ─►  source: olan-mobile             │──► MODEL_SERVER_URL
   (app móvil)      │  source: olan-web                │    (servidor Ollama
   (web OLAN)       │  auth: mismo JWT / usuarios      │     dedicado)
                    │                                  │
   Plataforma       ─►  source: alania-web             │
   Alania           │  source: alania-app (preparado)  │
   (web + app fut.) │  auth: mismo sistema             │
                    └─────────────────────────────────┘
```

- **OLAN** — app móvil `frontend-app-olan-2024` + sitio web propio. Usuarios compartidos (mismo JWT y BD).
- **Alania** — web actual de AlanIA + app futura (path preparado con `alania-app`).
- **Modelo remoto** — Ollama corre en un servidor dedicado externo. El gateway lo consume vía HTTP con `MODEL_SERVER_URL`. En desarrollo local, la Mac hace de servidor del modelo.

---

## Características

- **Chat con IA** — Conversaciones con modelos Ollama (llama3.2, qwen3, etc.) con streaming SSE token a token
- **Múltiples perspectivas** — Genera 3 enfoques de investigación simultáneos sobre un tema
- **Historial por usuario** — Conversaciones persistidas en MongoDB (30 días TTL) + PostgreSQL
- **RAG** — Búsqueda semántica sobre documentos indexados con pgvector para respuestas contextuales
- **Texto a voz** — Síntesis Kokoro con caché MongoDB (30 min TTL), devuelve WAV
- **Voz a texto** — Transcripción Whisper (medium) para audio del usuario
- **Traducción** — Hasta 3 idiomas en una sola llamada usando el modelo local
- **Sistema educativo** — Prompts especializados para respuestas pedagógicamente correctas
- **Políticas de modelo por rol** — Cada rol (FREE, ACADEMIC, PLUS, ADMIN, APP) tiene modelo y límites asignados
- **Seguridad** — API key interna + JWT (access/refresh tokens) + Argon2 para contraseñas
- **Observabilidad** — Pino JSON logs, métricas Prometheus, request-id por cada petición
- **Rate limiting** — 30 req/min por IP

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | NestJS 10.x + TypeScript strict |
| LLM | Ollama remoto (servidor dedicado) — consumido vía HTTP |
| Base de datos | PostgreSQL 16 + pgvector |
| Cache / historial | MongoDB 7 |
| ORM | Prisma 5 |
| Auth | JWT (@nestjs/jwt) + Argon2 |
| TTS | Python FastAPI + Kokoro |
| STT | Python + Whisper medium |
| Logs | Pino + pino-http (JSON) |
| Métricas | prom-client (Prometheus) |
| Seguridad HTTP | Helmet + ThrottlerGuard |
| Web Alania | React + Vite → Nginx (Docker) |
| Web OLAN | React + Vite → Nginx (Docker) |
| Deploy | Docker Compose |

---

## Correr con Docker

### Prerequisitos

- Docker 24+ y Docker Compose v2
- Ollama instalado y corriendo (en la Mac para desarrollo, en servidor dedicado para producción)
- 8 GB RAM mínimo

### Primer uso — copiar variables de entorno

```bash
cp .env.example .env
# Editar .env con tus valores reales (ver sección Variables de entorno)
```

---

### Modo desarrollo (hot-reload)

Usa `docker-compose.dev.yml` encima del base. El código se monta como volumen, los cambios se reflejan sin rebuild. El modelo corre en la Mac directamente (no en Docker).

**Requisito:** Ollama corriendo en la Mac en `http://localhost:11434`.

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Para correr en segundo plano:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

Ver logs en tiempo real:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml logs -f
```

Accesos en desarrollo:

| Servicio | URL |
|---|---|
| **Web Alania** | http://localhost:5175 |
| **Web OLAN** | http://localhost:5176 |
| **Gateway API** | http://localhost:4005 |
| **Health** | http://localhost:4005/health/ready |

---

### Modo producción

Usa solo `docker-compose.yml`. Builds optimizados, las webs sirven con Nginx. El modelo debe estar en un servidor externo.

**Requisito:** `MODEL_SERVER_URL` en `.env` apuntando al servidor Ollama dedicado.

```bash
# Levantar todo
docker compose up -d --build

# Verificar que todo está sano
docker compose ps
curl http://127.0.0.1:4005/health/ready
```

Accesos en producción (internos, poner detrás de Nginx con HTTPS):

| Servicio | Puerto local |
|---|---|
| Gateway API | `127.0.0.1:4005` |
| Web Alania | `127.0.0.1:5175` |
| Web OLAN | `127.0.0.1:5176` |

---

### Comandos útiles

```bash
# Rebuild de un solo servicio (sin bajar los otros)
docker compose up -d --build olan-ai-gateway

# Detener todo
docker compose down

# Detener y eliminar volúmenes (⚠️ borra la base de datos)
docker compose down -v

# Logs de un servicio específico
docker compose logs -f olan-ai-gateway
docker compose logs -f alania-web
docker compose logs -f olan-web

# Entrar al contenedor del gateway
docker compose exec olan-ai-gateway sh

# Ver estado de todos los contenedores
docker compose ps
```

---

### Modelos Ollama (correr en la Mac o en el servidor del modelo)

```bash
# Modelo de chat principal
ollama pull llama3.2:3b

# Modelo de traducción
ollama pull translategemma:4b

# Modelo de embeddings (requerido para RAG)
ollama pull nomic-embed-text

# (Opcional) Modelo de mayor calidad
ollama pull qwen3:4b
```

---

## Servicios Docker

| Contenedor | Puerto | Descripción |
|---|---|---|
| `olan-ai-gateway` | `127.0.0.1:4005` | API NestJS principal |
| `alania-web` | `127.0.0.1:5175` | Web Alania (Nginx + proxy al gateway) |
| `olan-web` | `127.0.0.1:5176` | Web OLAN (Nginx + proxy al gateway) |
| `olan-ai-postgres` | `127.0.0.1:5438` | PostgreSQL + pgvector |
| `olan-ai-mongodb` | `127.0.0.1:27017` | Historial y caché |
| `olan-tts` | `127.0.0.1:8880` | Síntesis Kokoro (interno) |
| `olan-stt` | `127.0.0.1:9000` | Transcripción Whisper (interno) |

> El modelo Ollama **no corre en este Docker Compose**. Se consume remotamente vía `MODEL_SERVER_URL`. En dev local apunta a `host.docker.internal:11434` (Ollama en tu Mac).

> Las webs **no exponen** `AI_GATEWAY_KEY` al navegador. El contenedor Nginx inyecta el header server-side al proxyear `/api` al gateway.

---

## Endpoints

Todas las rutas bajo `/api/*` requieren el header:

```
x-ai-gateway-key: <AI_GATEWAY_KEY>
```

Los endpoints de health y métricas no requieren autenticación.

### Chat

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/chat` | Respuesta completa (espera a que termine) |
| `POST` | `/api/chat/stream` | Streaming SSE token a token |
| `POST` | `/api/chat/perspectives/stream` | 3 perspectivas de investigación en SSE |

### Conversaciones

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/api/conversations` | Listar conversaciones del usuario |
| `GET` | `/api/conversations/:id/messages` | Mensajes de una conversación |
| `PATCH` | `/api/conversations/:id/title` | Renombrar conversación |
| `DELETE` | `/api/conversations/:id` | Eliminar conversación y mensajes |

### Servicios

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/translate` | Traducir a 1–3 idiomas |
| `POST` | `/api/tts` | Texto a voz (responde WAV) |
| `POST` | `/api/stt` | Voz a texto (subir archivo de audio) |
| `POST` | `/api/rag/search` | Búsqueda semántica en documentos |
| `POST` | `/api/documents` | Subir documento para indexar en RAG |
| `GET` | `/api/ollama/models` | Listar modelos disponibles en el servidor |

### Auth

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/auth/login` | Login → access token + refresh token |
| `POST` | `/api/auth/refresh` | Rotar refresh token |
| `POST` | `/api/auth/logout` | Revocar refresh token |

### Trial (landing page)

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/api/trial/chat` | Chat limitado para usuarios anónimos |

### Health y métricas

| Método | Ruta | Descripción |
|---|---|---|
| `GET` | `/health/live` | Proceso NestJS activo |
| `GET` | `/health/ready` | DB + MongoDB + TTS/STT listos |
| `GET` | `/metrics` | Métricas Prometheus |

---

## Política de modelos por rol

El gateway normaliza cada request según el rol del usuario. El cliente no puede elegir modelo ni parámetros arbitrarios.

| Rol | Modelo | Max tokens | Contexto | System custom |
|---|---:|---:|---:|---|
| `FREE` | `llama3.2:1b` | 300 | 2 048 | No |
| `ACADEMIC` | `llama3.2:3b` | 700 | 4 096 | No |
| `PLUS` | `llama3.2:3b` | 900 | 4 096 | No |
| `ADMIN` | cualquiera | 2 000 | 8 192 | Sí |
| `APP` | cualquiera | 2 000 | 8 192 | Sí |

El rol `APP` se asigna automáticamente a requests de fuentes confiables:

| Source | Plataforma |
|---|---|
| `olan-mobile`, `olan-app`, `olan-web`, `olan-voice`, `olan-system`, `olan-practice-*` | OLAN |
| `alania-web`, `alania-app`, `alania-voice`, `alania-system`, `alania-practice-*` | Alania |

Cualquier fuente sin JWT cae en `FREE`.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto del servidor | `4005` |
| `NODE_ENV` | Entorno de ejecución | `production` |
| `LOG_LEVEL` | Nivel de logs Pino | `info` |
| `AI_GATEWAY_KEY` | Clave interna de autenticación (mín. 32 chars) | `openssl rand -hex 32` |
| `REQUEST_TIMEOUT_MS` | Timeout global de requests | `120000` |
| `DATABASE_URL` | URL PostgreSQL | `postgresql://user:pass@postgres:5438/db` |
| `POSTGRES_USER` | Usuario DB | `olan_admin_ai` |
| `POSTGRES_PASSWORD` | Contraseña DB | — |
| `POSTGRES_DB` | Nombre de la base de datos | `olan_ai` |
| `MONGODB_URI` | URL MongoDB | `mongodb://mongodb:27017/olan_ai_gateway` |
| `MONGODB_DB` | Base MongoDB del gateway | `olan_ai_gateway` |
| `CONVERSATION_TTL_SECONDS` | TTL de conversaciones en MongoDB | `2592000` (30 días) |
| `MODEL_SERVER_URL` | URL del servidor Ollama remoto | `http://host.docker.internal:11434` |
| `OLLAMA_BASE_URL` | Alias legacy de `MODEL_SERVER_URL` (usar el nuevo) | — |
| `OLLAMA_EMBEDDING_MODEL` | Modelo para embeddings RAG | `nomic-embed-text` |
| `EMBEDDING_DIMENSIONS` | Dimensiones del vector | `768` |
| `OLLAMA_NUM_THREAD` | Hilos de CPU para Ollama | `8` |
| `TTS_SERVICE_URL` | URL del servicio TTS | `http://tts-service:8880` |
| `STT_SERVICE_URL` | URL del servicio STT | `http://stt-service:9000` |
| `WHISPER_MODEL` | Modelo Whisper | `medium` |
| `MAX_CONTEXT_CHUNKS` | Chunks RAG máximos por request | `5` |
| `MAX_CHUNK_CHARS` | Caracteres máximos por chunk | `1200` |
| `MAX_QUESTION_CHARS` | Longitud máxima de pregunta | `1000` |
| `JWT_SECRET` | Secreto para firmar JWT (mín. 32 chars) | `openssl rand -hex 32` |
| `JWT_ISSUER` | Issuer del JWT | `olan-ai-gateway` |
| `JWT_AUDIENCE` | Audience del JWT | `olan-app` |
| `JWT_ACCESS_TTL_SECONDS` | Duración del access token | `900` (15 min) |
| `JWT_REFRESH_TTL_SECONDS` | Duración del refresh token | `2592000` (30 días) |
| `ADMIN_EMAIL` | Email del admin inicial | `admin@ejemplo.com` |
| `ADMIN_PASSWORD` | Contraseña del admin inicial | — |
| `CORS_ORIGINS` | Orígenes permitidos (separados por coma) | `https://ai.alania.com,https://ai.olan.com` |
| `TRIAL_DEFAULT_MODEL` | Modelo para preguntas de prueba | `alania` |

Generar secretos seguros:

```bash
openssl rand -hex 32      # AI_GATEWAY_KEY y JWT_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 24   # ADMIN_PASSWORD
```

---

## Arquitectura interna

El proyecto sigue arquitectura limpia (Clean Architecture / Ports & Adapters):

```
src/
├── domain/              # Reglas de negocio puras (sin dependencias externas)
│   ├── ai/policies/     # chat-policy.ts — modelo y límites por rol
│   ├── auth/            # user-role.ts — enum de roles
│   └── platform/        # platform.ts — enum Platform (OLAN | ALANIA) + resolvePlatform()
│
├── application/         # Casos de uso y contratos
│   ├── use-cases/       # AskQuestionUseCase, StreamChatUseCase, StreamPerspectivesUseCase
│   ├── services/        # ModelPolicyService, PromptBuilderService
│   ├── ports/           # LlmPort, VectorStorePort (interfaces/abstracciones)
│   └── contracts/       # Tipos compartidos entre capas
│
├── infrastructure/      # Implementaciones de los puertos
│   ├── llm/             # ollama.adapter.ts (implementa LlmPort)
│   ├── vector-store/    # pgvector.adapter.ts (implementa VectorStorePort)
│   └── observability/   # MetricsInterceptor, ObservabilityService (Prometheus)
│
├── interface/http/      # Capa HTTP
│   ├── controllers/     # 11 controladores (chat, conversations, auth, health, etc.)
│   ├── dto/             # DTOs de request/response con class-validator
│   ├── guards/          # ApiKeyGuard, JwtAuthGuard, TrialLimitGuard, AdminGuard
│   ├── filters/         # HttpExceptionFilter
│   └── interceptors/    # TimeoutInterceptor, MetricsInterceptor
│
├── modules/
│   ├── chat/            # ChatService + prompts del sistema educativo
│   ├── conversations/   # Gestión de historial (MongoDB hot + PostgreSQL cold)
│   ├── rag/             # Servicio RAG (embedding + búsqueda vectorial)
│   ├── ollama/          # OllamaService (cliente HTTP al servidor del modelo)
│   ├── auth/            # AuthService (JWT, Argon2, sesiones)
│   ├── tts/             # TTS — integración con FastAPI Kokoro
│   ├── stt/             # STT — integración con Whisper
│   ├── translate/       # Traducción vía translategemma:4b
│   ├── documents/       # Gestión de documentos para RAG
│   ├── trial/           # Límite de preguntas para landing page
│   └── languages/       # Perfil de idiomas y adventure mode
│
└── config/              # app.config.ts — validación de variables de entorno

web/
├── alania/              # Web Alania — React + Vite → Nginx, puerto 5175
└── olan/                # Web OLAN — React + Vite → Nginx, puerto 5176
```

### Flujo de una petición de chat

```
POST /api/chat/stream
       │
       ▼
ApiKeyGuard → valida x-ai-gateway-key
       │
       ▼
JwtAuthGuard (opcional) → extrae userId y rol del JWT
       │
       ▼
ChatController → llama StreamChatUseCase
       │
       ├─ ModelPolicyService → resuelve modelo y límites según rol + plataforma
       ├─ ConversationsService → carga historial de MongoDB
       ├─ RagService (si useRag: true) → embed pregunta → búsqueda pgvector
       │
       ▼
OllamaService.chatStream() → llama MODEL_SERVER_URL (servidor externo)
       │
       ▼
SSE response → tokens al cliente
       │
       ▼
ConversationsService → guarda en MongoDB + encola resumen en PostgreSQL
LogsService → guarda auditoría en AiChatLog
```

### Persistencia

| Dato | Fuente de verdad | Caché auxiliar |
|---|---|---|
| Conversaciones y mensajes | PostgreSQL (`AiConversation`, `AiConversationMessage`) | MongoDB (historial caliente, 30 días) |
| Logs y auditoría | PostgreSQL (`AiChatLog`) | — |
| Documentos y embeddings RAG | PostgreSQL + pgvector (`AiDocument`, `AiDocumentEmbedding`) | — |
| Audio TTS | MongoDB (TTL 30 min) + disco | — |
| Sesiones JWT | PostgreSQL (`AuthSession`) | — |
| Lista de modelos | Memoria (30 s TTL) | — |

---

## Esquema de base de datos

Modelos principales en `prisma/schema.prisma`:

| Modelo | Descripción |
|---|---|
| `User` | Usuarios (email, passwordHash, rol: FREE/ACADEMIC/PLUS/ADMIN) |
| `AuthSession` | Refresh tokens activos (hash + revocación) |
| `AiConversation` | Contenedor de conversación (título, resumen automático) |
| `AiConversationMessage` | Mensajes individuales (rol, contenido, modelo, estado) |
| `AiChatLog` | Auditoría de cada chat (duración, modelo, fuente, estado) |
| `AiDocument` | Documentos para RAG (título, tipo, fuente URL) |
| `AiDocumentChunk` | Fragmentos de texto de cada documento |
| `AiDocumentEmbedding` | Vectores pgvector (768 dimensiones, nomic-embed-text) |
| `TranslationSave` | Traducciones guardadas por usuario |

---

## Desarrollo local sin Docker

```bash
# Instalar dependencias
pnpm install

# Levantar infraestructura (DB, MongoDB, TTS, STT)
docker compose up -d postgres mongodb tts-service stt-service

# Generar cliente Prisma y correr migraciones
pnpm exec prisma generate
pnpm exec prisma migrate deploy

# El modelo corre en la Mac directamente
# Asegurarse de que Ollama esté corriendo: ollama list

# Iniciar gateway en modo desarrollo (hot reload)
pnpm start:dev

# Webs en terminales separadas
cd web/alania && npm run dev   # http://localhost:5175
cd web/olan   && npm run dev   # http://localhost:5176
```

### Comandos útiles

```bash
pnpm build                              # Compilar TypeScript
pnpm exec prisma migrate dev            # Crear migración nueva
pnpm exec prisma studio                 # GUI de base de datos
docker compose logs -f olan-ai-gateway  # Logs del gateway
docker compose exec mongodb mongosh     # Explorar MongoDB
```

---

## Integración con la app móvil OLAN

```env
OLAN_AI_GATEWAY_URL=https://ai.tudominio.com
OLAN_AI_GATEWAY_KEY=tu_clave_interna_de_32_chars
OLAN_AI_MODEL=llama3.2:3b
OLAN_AI_USE_RAG=false
```

El cliente TypeScript preconfigurado está en `src/client/olan-ai-gateway.client.ts`:

```typescript
import { createOlanAiGatewayClient, resolveUserMessage } from './olan-ai-gateway.client';

const client = createOlanAiGatewayClient();

// Chat normal
const response = await client.chat({
  question: 'Explica la ley de oferta y demanda',
  model: 'llama3.2:3b',
  userId: user.id,
  conversationId: session.conversationId,
});
const text = resolveUserMessage(response);

// Chat streaming
const final = await client.streamChat(
  { question, model, userId: user.id },
  (token) => appendTokenToUI(token),
);
```

---

## Observabilidad

- Cada request recibe un `x-request-id` único (o respeta el que envía el cliente).
- Logs en JSON con `pino-http`. Nivel configurable con `LOG_LEVEL`.
- `/metrics` expone Prometheus con:
  - Duración y errores HTTP por ruta y método
  - Métricas de Ollama: tokens generados, duración por modelo
  - Duración por etapa: `rag.*`, `mongodb.*`, `tts.*`, `stt.*`
  - Streams SSE activos concurrentemente

---

## Seguridad

- `AI_GATEWAY_KEY` — nunca exponer al frontend. Solo el backend de Olan la tiene.
- Passwords hasheados con Argon2 (salt automático).
- JWT con access token (15 min) + refresh token (30 días). El refresh token se guarda como hash en la DB para permitir revocación.
- Helmet configura headers HTTP de seguridad.
- Rate limiting: 30 req/min por IP.
- Ningún servicio interno queda accesible desde internet; solo el gateway escucha en el puerto expuesto.
- El modelo Ollama corre en servidor separado, aislado de internet.

---

## Despliegue en VPS

Ver [DEPLOY.md](DEPLOY.md) para instrucciones completas (instalación desde cero, actualización, Nginx + HTTPS, troubleshooting).

Actualización rápida en servidor existente:

```bash
cd ~/olan-ai-gateway
git pull origin main
docker compose build olan-ai-gateway alania-web olan-web
docker compose up -d olan-ai-gateway alania-web olan-web
curl http://127.0.0.1:4005/health/ready
```

---

## Licencia

Interno Olan. No distribuir sin autorización.
