<div align="center">
  <pre role="img" aria-label="ACoreAI Gateway">
█████╗  ██████╗ ██████╗ ██████╗ ███████╗ █████╗ ██╗       ██████╗  █████╗ ████████╗███████╗██╗    ██╗ █████╗ ██╗   ██╗
██╔══██╗██╔════╝██╔═══██╗██╔══██╗██╔════╝██╔══██╗██║      ██╔════╝ ██╔══██╗╚══██╔══╝██╔════╝██║    ██║██╔══██╗╚██╗ ██╔╝
███████║██║     ██║   ██║██████╔╝█████╗  ███████║██║█████╗██║  ███╗███████║   ██║   █████╗  ██║ █╗ ██║███████║ ╚████╔╝
██╔══██║██║     ██║   ██║██╔══██╗██╔══╝  ██╔══██║██║╚════╝██║   ██║██╔══██║   ██║   ██╔══╝  ██║███╗██║██╔══██║  ╚██╔╝
██║  ██║╚██████╗╚██████╔╝██║  ██║███████╗██║  ██║██║      ╚██████╔╝██║  ██║   ██║   ███████╗╚███╔███╔╝██║  ██║   ██║
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝       ╚═════╝ ╚═╝  ╚═╝   ╚═╝   ╚══════╝ ╚══╝╚══╝ ╚═╝  ╚═╝   ╚═╝
  </pre>
  <p><strong>Asistentes de IA conectados a conocimiento privado, revisado y trazable.</strong></p>
  <p>API modular y aplicación web para integrar chat, búsqueda RAG y herramientas de administración.</p>
  <p>
    <img src="https://img.shields.io/badge/Backend-NestJS-EA2845?logo=nestjs&logoColor=white" alt="Backend NestJS" />
    <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?logo=react&logoColor=black" alt="Frontend React y Vite" />
    <img src="https://img.shields.io/badge/Datos-PostgreSQL%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white" alt="PostgreSQL y pgvector" />
    <img src="https://img.shields.io/badge/Runtime-Node.js%2020-339933?logo=node.js&logoColor=white" alt="Node.js 20" />
  </p>
  <p>
    <a href="#inicio-rápido">Inicio rápido</a> ·
    <a href="#capacidades">Capacidades</a> ·
    <a href="#api">API</a> ·
    <a href="#desarrollo">Desarrollo</a> ·
    <a href="#documentación">Documentación</a>
  </p>
</div>

ACoreAI Gateway es una plataforma para crear asistentes que respondan con
información de una organización. Conecta una aplicación con autenticación,
conversaciones, conocimiento aprobado y un proveedor de modelos configurable.
Se adapta a cada producto; no es un chatbot configurado para un negocio
específico.

> La búsqueda normal sólo usa fragmentos asociados a fuentes y versiones
> publicadas y vigentes. Si no encuentra contexto aprobado, el chat devuelve
> `no_context` en lugar de responder con conocimiento general.

## Capacidades

| Área | Qué incluye |
| --- | --- |
| Chat | Respuestas normales y streaming SSE, conversaciones, historial, títulos y resúmenes. |
| Autenticación | Usuarios, roles, JWT, sesiones con refresh tokens y dispositivos. |
| Centro de conocimiento | Conversión de fuentes, versiones, revisión, publicación, auditoría, citas y preguntas sin respuesta. |
| RAG | Búsqueda semántica con PostgreSQL y pgvector; generación y embeddings mediante Ollama. |
| Aplicación web | Experiencia de usuario, administración del conocimiento y consola interna de desarrollo. |
| Servicios adicionales | Traducción, texto a voz, voz a texto, práctica de idiomas, trial y automatizaciones. |
| Operación | Docker Compose, health checks, logs estructurados y métricas Prometheus. |

## Cómo funciona

```text
Producto o aplicación
          ↓
      ACoreAI Gateway
       ├── autenticación, chat y RAG
       ├── PostgreSQL + pgvector
       ├── MongoDB
       ├── Ollama
       └── TTS y STT opcionales
```

PostgreSQL conserva los datos principales y los embeddings; MongoDB se usa para
historial caliente y cachés. La recuperación de conocimiento pasa por el flujo
de revisión y publicación antes de llegar al chat. Las reglas de negocio viven
en el dominio y la aplicación, separadas de HTTP, Prisma, MongoDB y Ollama.

## Inicio rápido

### Requisitos

- Node.js **20.x** y pnpm (la imagen del gateway usa 20.19.5).
- Docker y Docker Compose v2 para ejecutar el stack completo.
- Configuración privada suministrada por el entorno de ejecución o despliegue.

El repositorio no incluye plantillas ni ejemplos para configuración privada.

### Arrancar el stack de desarrollo

Instala las dependencias desde la raíz:

```bash
pnpm install
```

Instala también las dependencias del cliente web:

```bash
cd web/app
pnpm install
cd ../..
```

Levanta la aplicación y sus servicios:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Servicio | Dirección local |
| --- | --- |
| Aplicación web | [http://localhost:5175](http://localhost:5175) |
| Administración | [http://localhost:5175/admin](http://localhost:5175/admin) |
| Consola interna | [http://localhost:5175/admin-dev](http://localhost:5175/admin-dev) |
| API Gateway | [http://localhost:4005](http://localhost:4005) |
| Readiness | [http://localhost:4005/health/ready](http://localhost:4005/health/ready) |
| Métricas | [http://localhost:4005/metrics](http://localhost:4005/metrics) |

La consola interna requiere una sesión con rol `ADMIN`; la administración
aplica permisos según el rol de la persona.

### Ejecutar los procesos por separado

Si PostgreSQL, MongoDB y el servidor de modelos ya están disponibles, genera el
cliente de Prisma y aplica las migraciones:

```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
```

Inicia el backend desde la raíz del repositorio:

```bash
pnpm start:dev
```

Para iniciar sólo la web, usa otra terminal:

```bash
cd web/app
pnpm dev
```

## API

Las rutas de negocio usan el prefijo `/api`. Las rutas de salud y métricas no
usan ese prefijo.

| Método y ruta | Uso |
| --- | --- |
| `POST /api/chat` | Envía una consulta al chat. |
| `POST /api/chat/stream` | Recibe la respuesta del chat mediante SSE. |
| `POST /api/chat/rag` | Consulta el chat con conocimiento publicado y vigente. |
| `POST /api/rag/search` | Busca contexto RAG; requiere los controles de acceso de administración. |
| `GET /api/conversations` | Lista conversaciones disponibles para la sesión. |
| `POST /api/auth/login` · `POST /api/auth/refresh` | Inicia sesión y renueva una sesión. |
| `POST /api/translate` · `POST /api/tts` · `POST /api/stt` | Traducción, síntesis de voz y transcripción opcionales. |
| `GET /health/live` · `GET /health/ready` | Comprueba disponibilidad y readiness. |
| `GET /metrics` | Expone métricas Prometheus. |

Las rutas de negocio aplican autenticación y autorización según el flujo. Las
claves privadas se mantienen en el servidor y no deben llegar al bundle del
frontend ni a logs o documentación.

## Desarrollo

Los comandos se ejecutan desde la raíz, salvo que se indique otra carpeta.

| Comando | Resultado |
| --- | --- |
| `pnpm doctor` | Revisa la estructura documental y referencias retiradas. |
| `pnpm lint` | Revisa el cliente web y comprueba TypeScript del backend. |
| `pnpm build` | Compila backend y frontend. |
| `pnpm test` | Ejecuta las pruebas del backend. |
| `pnpm test:e2e` | Ejecuta el flujo E2E con Docker. |
| `pnpm verify:docker` | Ejecuta la verificación de calidad dentro de Docker. |

El [workflow de CI](.github/workflows/ci.yml) ejecuta doctor, lint, build,
migraciones y las pruebas smoke y HTTP E2E en pull requests y cambios a `main`.

Las pruebas que usan la aplicación requieren la configuración de runtime y los
servicios externos correspondientes. El E2E y la verificación Docker también
requieren Docker disponible.

## Estructura del repositorio

```text
src/
├── domain/            reglas de negocio
├── application/       casos de uso, servicios y puertos
├── infrastructure/    persistencia y proveedores externos
├── interfaces/http/   controllers, DTOs, guards y filtros
├── modules/           composición por capacidad
├── config/            lectura y validación del runtime
└── client/            cliente interno del gateway

web/app/               aplicación React + Vite
docker/                imágenes y configuración de infraestructura
prisma/                schema, migraciones y seeds
services/              servicios opcionales TTS y STT
test/                  pruebas smoke y E2E
docs/                  arquitectura, reglas, estado y workflows
```

## Documentación

| Documento | Contenido |
| --- | --- |
| [Arquitectura](docs/ARCHITECTURE.md) | Límites de módulos y flujos de chat y RAG. |
| [Reglas del proyecto](docs/RULES.md) | Invariantes, configuración privada y límites de cambios. |
| [Decisiones](docs/DECISIONS.md) | Decisiones técnicas y su contexto. |
| [Riesgos](docs/RISKS.md) | Riesgos abiertos y mitigaciones. |
| [Backlog](docs/BACKLOG.md) | Prioridades y criterios de aceptación. |
| [Estado operativo](docs/ai/PROJECT_STATE.md) | Resumen del estado actual del producto. |
| [AGENTS.md](AGENTS.md) | Entrada e instrucciones para agentes del repositorio. |

## Seguridad y operación

- Mantén las fuentes pendientes de revisión, vencidas o archivadas fuera de la búsqueda normal.
- Publica el gateway detrás de HTTPS y limita el acceso a bases de datos y servicios internos.
- La configuración privada se entrega desde el entorno de ejecución o despliegue; no se versiona en el repositorio.
- Revisa permisos, publicación y acceso en los cambios que afecten conocimiento o autenticación.
