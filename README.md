# ACoreAI Gateway

Reusable AI gateway and product foundation for building chat, knowledge, voice, translation, and education-focused AI applications.

The project is intentionally structured as a template: ACoreAI provides the shared platform capabilities, while future products can add their own prompts, branding, domain modules, and client applications without rewriting the core gateway.

## What this project is becoming

ACoreAI is being developed as a reusable AI platform with four layers:

1. **Gateway:** secure API, model policies, authentication, conversations, streaming, and observability.
2. **Knowledge platform:** supervised RAG with document versioning, review, publication, embeddings, citations, and audit trails.
3. **AI services:** chat, perspectives, translation, text-to-speech, speech-to-text, and language-learning workflows.
4. **Product surfaces:** a reusable React web client and an administration panel that can be adapted for different AI products.

The platform is not a fine-tuning system and it does not learn autonomously from uploaded documents. Its knowledge workflow is controlled:

```text
source → extraction → chunking → human review → approval
       → embeddings → publication → grounded retrieval
```

## Current capabilities

- NestJS gateway written in strict TypeScript.
- Ollama integration over HTTP with configurable models.
- Complete and streaming chat responses through SSE.
- Conversation history, summaries, titles, and persistence.
- Role-based model policies for free, academic, plus, app, and admin clients.
- JWT access/refresh sessions and Argon2 password hashing.
- PostgreSQL with Prisma and pgvector.
- MongoDB for hot conversation history and short-lived caches.
- Supervised RAG with source versions, review states, validity periods, embeddings, search logs, and citations.
- React/Vite ACoreAI web client.
- React/Vite knowledge administration panel.
- Translation, TTS, STT, trial chat, and language-learning modules.
- Prometheus metrics, JSON logging, request IDs, throttling, and health checks.
- Docker Compose development and production environments.

## Architecture

```text
┌─────────────────────┐       ┌─────────────────────┐
│ ACoreAI Web         │       │ Knowledge Admin     │
│ React + Vite        │       │ React + Vite        │
└──────────┬──────────┘       └──────────┬──────────┘
           └──────────────┬──────────────┘
                          ▼
                 ┌───────────────────┐
                 │ acoreai-gateway   │
                 │ NestJS API        │
                 └─────┬─────┬───────┘
                       │     │
             ┌─────────┘     └──────────┐
             ▼                         ▼
      PostgreSQL + pgvector       MongoDB
             │
             ├──────────────► Ollama
             ├──────────────► TTS service
             └──────────────► STT service
```

The code follows a modular Clean Architecture / Ports & Adapters approach:

```text
src/domain/          Business rules and stable domain types
src/application/     Use cases, ports, and application services
src/infrastructure/  Prisma, MongoDB, Ollama, pgvector, metrics
src/interfaces/http/ Controllers, DTOs, guards, filters, interceptors
src/modules/         NestJS feature modules
web/acoreai/         Reusable AI product web client
web/admin/            Knowledge and process administration
services/             Python TTS and STT services
prisma/               Schema, migrations, and seeds
```

## Technology stack

| Layer | Technology |
|---|---|
| Backend | NestJS, TypeScript, Express |
| LLM | Ollama |
| Relational data | PostgreSQL, Prisma, pgvector |
| Hot storage/cache | MongoDB |
| Authentication | JWT, Argon2 |
| Frontend | React, Vite, TypeScript |
| Admin UI | React Query, React Hook Form, Zod, TailwindCSS |
| TTS | Python, FastAPI, edge-tts |
| STT | Python, FastAPI, faster-whisper |
| Observability | Pino, Prometheus, prom-client |
| Deployment | Docker Compose, Nginx |

## Run locally

### Requirements

- Node.js 20+
- pnpm
- Docker 24+
- Docker Compose v2
- Ollama, locally or on a reachable model server

### Install dependencies

```bash
pnpm install
cd web/acoreai && npm install
cd ../admin && npm install
cd ../..
```

The `.env` files are local-only and are ignored by Git. Configure them according to the deployment documentation. Never commit real credentials.

### Development with Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Development endpoints:

| Service | URL |
|---|---|
| ACoreAI Web | http://localhost:5175 |
| Admin | http://localhost:5180 |
| Gateway | http://localhost:4005 |
| Readiness | http://localhost:4005/health/ready |

### Development without the full stack

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

Run the web applications separately when needed:

```bash
cd web/acoreai && npm run dev
cd web/admin && npm run dev
```

## Main API areas

- `POST /api/chat` — complete chat response.
- `POST /api/chat/stream` — SSE chat stream.
- `POST /api/chat/perspectives/stream` — multiple perspectives stream.
- `GET /api/conversations` — conversation history.
- `POST /api/rag/search` — semantic knowledge search.
- `POST /api/chat/rag` — grounded RAG chat.
- Knowledge source, review, publication, audit, and watcher endpoints.
- `POST /api/translate` — translation.
- `POST /api/tts` — text to speech.
- `POST /api/stt` — speech to text.
- `POST /api/auth/login` — standard authentication.
- `GET /health/live` and `GET /health/ready` — health checks.
- `GET /metrics` — Prometheus metrics.

All protected API routes require the internal `AI_GATEWAY_KEY`. The key must remain server-side and must never be exposed through browser-visible `VITE_*` variables in production.

## Supervised knowledge model

The Knowledge Center is designed for institutional or product-specific information:

- Sources are extracted, normalized, chunked, reviewed, and versioned.
- Embeddings are generated through Ollama and stored in pgvector.
- Retrieval uses semantic similarity plus priority and freshness signals.
- Only approved, published, and currently valid chunks can answer RAG queries.
- Search activity, unanswered questions, source citations, and administrative transitions are auditable.
- URL watchers create new versions for review; they do not publish automatically.

## Current limitations

- There is no fine-tuning pipeline.
- Tool calling and real external action execution are not implemented.
- Automation processes are modeled and administered, but an execution engine is still pending.
- Long-running extraction and embedding jobs need a dedicated queue for production scale.
- The web build requires dependencies to be installed locally before validation.
- Evaluation datasets for retrieval quality, groundedness, and hallucination rates are still needed.

## Direction and next milestones

The next stage is to turn this foundation into a productized template:

1. Keep the gateway brand-neutral and isolate product-specific configuration.
2. Unify all chat flows behind one orchestration pipeline.
3. Add automated tests for policies, authentication, RAG, publishing, and language progression.
4. Add evaluation and monitoring for answer quality and source grounding.
5. Add queues and retry policies for heavy AI and document-processing tasks.
6. Add a safe tool/action layer with validation, permissions, dry runs, and audit logs.
7. Make product branding, prompts, domains, and enabled modules configurable per deployment.

Additional working plans and AI context documents are kept locally in `docs/ai/`, which is intentionally ignored by Git.

## Security notes

- Keep `.env` files out of commits.
- Rotate gateway, database, JWT, and administrator credentials per deployment.
- Do not expose `AI_GATEWAY_KEY` to browser bundles.
- Put production services behind HTTPS and a restricted reverse proxy.
- Review uploaded files and sensitive data before publishing them to the knowledge base.
- Do not use `docker compose down -v` unless local database volumes can be discarded.

## License

Internal ACoreAI project. Add a public license before distributing the template externally.
