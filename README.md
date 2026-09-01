# ACoreAI Gateway

ACoreAI Gateway es la base técnica para construir asistentes de IA que puedan
responder usando el conocimiento privado de una organización.

La idea, explicada de forma sencilla, es esta:

```text
documento → revisión humana → publicación → búsqueda → respuesta con fuentes
```

El gateway se encarga de conectar la aplicación, la autenticación, las bases
de datos, el buscador de conocimiento y el modelo de IA. No es un chatbot
terminado para un negocio concreto: es una plataforma que se puede adaptar.

## ¿Qué problema resuelve?

Un asistente empresarial no debería responder sólo porque un modelo “recuerda”
algo. Primero debe buscar información aprobada, respetar permisos y poder
explicar de dónde salió la respuesta.

ACoreAI organiza ese proceso:

1. Se carga una fuente de conocimiento.
2. La fuente se convierte en contenido que el sistema puede buscar.
3. Una persona la revisa y decide si se publica.
4. El asistente busca sólo contenido aprobado, vigente y permitido.
5. La respuesta puede mostrar las fuentes que la respaldan.

## ¿Qué incluye hoy?

- API en NestJS y TypeScript estricto.
- Chat normal y chat por streaming SSE.
- Usuarios, roles, JWT, refresh tokens y dispositivos.
- Conversaciones persistentes, títulos, resúmenes e historial.
- Centro de conocimiento con fuentes, versiones, revisión, publicación,
  auditoría, citas y preguntas sin respuesta.
- RAG con PostgreSQL, pgvector y embeddings.
- Ollama para generar respuestas, clasificar consultas y crear embeddings.
- Aplicación web React/Vite con área de usuario, administración y consola
  interna de desarrollo.
- Servicios opcionales de traducción, texto a voz, voz a texto, idiomas,
  trial y automatizaciones.
- Docker Compose, Nginx, health checks, logs JSON y métricas Prometheus.

## Cómo se conectan las piezas

```text
Aplicación web o producto
            ↓
      ACoreAI Gateway
       ├── PostgreSQL + Prisma + pgvector
       ├── MongoDB
       ├── Ollama
       ├── TTS opcional
       └── STT opcional
```

PostgreSQL guarda la información principal: usuarios, permisos, fuentes,
publicaciones, conversaciones y auditoría. pgvector permite buscar fragmentos
parecidos. MongoDB conserva historial caliente y cachés. Ollama genera texto y
embeddings.

## Organización del repositorio

```text
src/
├── domain/            reglas de negocio puras
├── application/       casos de uso, servicios y puertos
├── infrastructure/    conexión con bases de datos y proveedores
├── interfaces/http/   controllers, DTOs, guards y filtros
├── modules/            composición de cada capacidad
├── config/             validación de configuración del proceso
└── client/             cliente interno del gateway

web/app/               aplicación web unificada
services/               servicios opcionales TTS y STT
prisma/                 schema, migraciones y seeds
docker/                 imágenes y configuración de infraestructura
scripts/                desarrollo, pruebas E2E y operación
test/                   pruebas smoke y E2E
docs/                   arquitectura, reglas, estado y workflows
```

El backend sigue una idea importante: las reglas del negocio no deben depender
directamente de HTTP, Prisma, MongoDB u Ollama. Por eso los controllers usan
casos de uso o puertos, y los adapters traducen entre la aplicación y cada
proveedor.

## Regla sobre configuración privada

Las credenciales y la configuración de cada instalación se entregan fuera del
repositorio, mediante el entorno de ejecución o el sistema de despliegue.

No se crean ni se versionan plantillas, ejemplos, valores o instrucciones de
configuración privada. Esto evita secretos falsos, configuraciones obsoletas y
confusión entre desarrollo, pruebas y producción.

## Cómo empezar

### Requisitos

- Node.js 20 o superior.
- pnpm.
- Docker 24 o superior y Docker Compose v2.
- Ollama local o un servidor de modelos accesible.

### Preparación

Primero provisiona la configuración privada fuera del repositorio. Después
instala las dependencias:

```bash
pnpm install
cd web/app && pnpm install
cd ../..
```

### Arrancar con Docker

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

Direcciones principales:

| Servicio | Dirección |
| --- | --- |
| Aplicación web | http://localhost:5175 |
| Administración | http://localhost:5175/admin |
| Consola interna | http://localhost:5175/admin-dev |
| Gateway | http://localhost:4005 |
| Readiness | http://localhost:4005/health/ready |
| Métricas | http://localhost:4005/metrics |

La consola interna requiere una sesión con rol `ADMIN`.

### Arrancar sin el stack completo

Si PostgreSQL, MongoDB y Ollama ya están disponibles, puedes ejecutar:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm start:dev
```

Para levantar la aplicación web por separado:

```bash
cd web/app && pnpm dev
```

## Cómo comprobar los cambios

El orden recomendado para una tarea es:

```bash
pnpm doctor
pnpm lint
pnpm build
pnpm test
git diff --check
```

`pnpm doctor` comprueba que la estructura de gobierno siga completa y que no
regresen plantillas retiradas. `pnpm lint` revisa frontend y backend. `pnpm
build` compila ambos paquetes. `pnpm test` ejecuta las pruebas del backend;
algunas pruebas necesitan PostgreSQL y MongoDB disponibles.

### Prueba E2E

El flujo E2E levanta un entorno aislado, aplica las migraciones, inicia sesión,
consulta un perfil, envía un mensaje protegido y comprueba la persistencia de
la conversación:

```bash
pnpm test:e2e
```

Para ejecutar la verificación completa dentro de Docker:

```bash
pnpm verify:docker
```

Para detener el stack E2E:

```bash
docker compose --project-name acoreai-e2e -f docker-compose.test.yml down
```

## API principal

| Área | Ejemplos |
| --- | --- |
| Chat | `POST /api/chat`, `POST /api/chat/stream` |
| Conversaciones | `GET /api/conversations`, `DELETE /api/conversations/:id` |
| Conocimiento | `POST /api/rag/search`, `POST /api/chat/rag` |
| Autenticación | `POST /api/auth/login`, `POST /api/auth/refresh` |
| Servicios opcionales | `/api/translate`, `/api/tts`, `/api/stt` |
| Sistema | `/health/live`, `/health/ready`, `/metrics` |

Las rutas protegidas validan autenticación, autorización y las claves internas
que correspondan. Las claves privadas nunca deben llegar al bundle público del
frontend ni aparecer en logs, pruebas o documentación.

## Reglas de seguridad y operación

- Usa credenciales únicas para cada instalación y rótalas periódicamente.
- Mantén el contenido no aprobado, vencido o sin permiso fuera de la búsqueda.
- Publica el gateway detrás de HTTPS y limita las redes de las bases de datos.
- Conserva logs, métricas y auditoría: sirven para entender qué ocurrió.
- No elimines volúmenes Docker salvo que quieras borrar esos datos de forma
  intencional.
- Revisa los casos negativos de permisos, publicación y acceso antes de cerrar
  un cambio.

## Documentación para agentes y equipo

- [AGENTS.md](AGENTS.md): punto de entrada para agentes.
- [CLAUDE.md](CLAUDE.md): adaptador para Claude Code.
- [docs/README.md](docs/README.md): índice de documentación.
- [docs/ai/PROJECT_STATE.md](docs/ai/PROJECT_STATE.md): estado corto del
  proyecto.
- [docs/ai/workflows/](docs/ai/workflows/): pasos por tipo de cambio.
- [docs/ai/agents/](docs/ai/agents/): responsabilidades de los roles.
- [docs/DECISIONS.md](docs/DECISIONS.md): decisiones importantes.
- [docs/BACKLOG.md](docs/BACKLOG.md): siguientes prioridades.

## Siguientes planes

El trabajo futuro, su estado real, las dependencias y los criterios de
aceptación viven en el [backlog priorizado](docs/BACKLOG.md). `BL-01` ya tiene
mitigación parcial aplicada; el bloque activo es `BL-02`, que termina de
unificar los pipelines de chat y su streaming.
