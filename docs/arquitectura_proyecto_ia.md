# Arquitectura recomendada para plataforma de IA con TTS, STT, API Gateway, Web, PostgreSQL, MongoDB y Ollama

## 1. Decisión principal

La arquitectura recomendada para este proyecto es:

```txt
Nx Monorepo
+ pnpm workspaces
+ Docker Compose para desarrollo local
+ API Gateway en TypeScript
+ Servicios de IA separados
+ STT/TTS en Python
+ PostgreSQL para datos transaccionales
+ MongoDB para contenido flexible
+ Redis para colas, caché y control de procesos
+ Ollama como servicio interno de inferencia
```

## 2. Veredicto sobre herramientas

### Opción elegida: Nx

Nx es la mejor opción para este proyecto porque permite manejar varias aplicaciones, servicios y librerías internas dentro de un mismo repositorio con mejor control de dependencias.

Este proyecto no será solo una web. Tendrá:

- Web.
- API Gateway.
- Servicios Python.
- Orquestador de IA.
- Comunicación con Ollama.
- Bases de datos.
- Librerías compartidas.
- Infraestructura Docker.
- Posible crecimiento a microservicios.

Por eso Nx encaja mejor que Turborepo o Gradle.

### Turborepo

Turborepo es buena opción si el proyecto fuera principalmente:

- Next.js.
- React.
- Paquetes TypeScript.
- Librerías frontend.
- Backend simple en Node.js.

No es la mejor opción cuando el proyecto incluye servicios Python, procesamiento de audio, modelos locales y múltiples servicios internos.

### Gradle

Gradle no debe usarse en este proyecto.

Tiene sentido cuando el ecosistema principal es:

- Java.
- Kotlin.
- Android.
- Spring Boot.

En este caso agregaría complejidad innecesaria.

## 3. Error que se debe evitar

No se debe confundir una herramienta de monorepo con la arquitectura completa.

Nx, Turborepo o Gradle no resuelven por sí solos:

- Procesamiento de audio.
- Inferencia con modelos.
- Persistencia.
- Seguridad.
- Streaming.
- Colas.
- Observabilidad.
- Escalabilidad.
- Separación de dominios.

La arquitectura debe definirse por responsabilidades, no por moda.

## 4. Estructura recomendada del repositorio

```txt
ai-platform/
│
├── apps/
│   ├── web/
│   │   └── Aplicación web principal
│   │
│   ├── api-gateway/
│   │   └── API pública en TypeScript
│   │
│   └── admin/
│       └── Panel administrativo opcional
│
├── services/
│   ├── stt-service/
│   │   └── Servicio Python para Speech-to-Text
│   │
│   ├── tts-service/
│   │   └── Servicio Python para Text-to-Speech
│   │
│   ├── ai-orchestrator/
│   │   └── Servicio encargado de prompts, modelos, memoria y flujos IA
│   │
│   └── worker-service/
│       └── Jobs pesados, procesamiento de audios, embeddings y tareas asincrónicas
│
├── packages/
│   ├── shared-types/
│   │   └── Tipos, DTOs y contratos compartidos
│   │
│   ├── config/
│   │   └── Configuración compartida de TypeScript, ESLint, variables y reglas
│   │
│   ├── ui/
│   │   └── Componentes reutilizables
│   │
│   └── sdk/
│       └── Cliente interno para consumir el API Gateway
│
├── infra/
│   ├── docker-compose.yml
│   ├── postgres/
│   ├── mongo/
│   ├── redis/
│   ├── nginx/
│   └── ollama/
│
├── models/
│   ├── ollama/
│   │   ├── Modelfiles
│   │   ├── prompts-base
│   │   └── configuración de modelos
│
├── docs/
│   ├── architecture.md
│   ├── api-contracts.md
│   ├── deployment.md
│   └── security.md
│
├── nx.json
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 5. Responsabilidad de cada parte

## 5.1 Web

La web debe encargarse únicamente de la experiencia del usuario.

Responsabilidades:

- Chat.
- Grabación de audio.
- Reproducción de audio generado por TTS.
- Login.
- Historial.
- Perfil del usuario.
- Selección de modo o modelo.
- Visualización de respuestas.
- Streaming de respuestas si aplica.

No debe:

- Llamar directamente a Ollama.
- Conectarse directo a PostgreSQL o MongoDB.
- Procesar audio pesado.
- Manejar lógica de prompts compleja.
- Guardar memoria por su cuenta.

## 5.2 API Gateway en TypeScript

El API Gateway será la puerta principal del sistema.

Tecnología recomendada:

```txt
NestJS o Fastify
```

Responsabilidades:

- Autenticación.
- Autorización.
- Rate limiting.
- Validación de requests.
- Manejo de sesiones.
- Exposición de endpoints públicos.
- Streaming SSE o WebSocket.
- Comunicación controlada con servicios internos.
- Protección de rutas.
- Logs principales.
- Control de errores hacia el cliente.

No debe:

- Ejecutar lógica pesada de IA.
- Procesar audio directamente.
- Hablar con Ollama desde múltiples controladores.
- Guardar documentos grandes.
- Convertirse en un backend gigante.

El gateway coordina, no piensa.

## 5.3 AI Orchestrator

Este servicio es el cerebro de la plataforma.

Puede estar en TypeScript o Python, pero para este proyecto se recomienda TypeScript si la mayor parte del backend está en TypeScript.

Responsabilidades:

- Construcción de prompts.
- Selección de modelo.
- Comunicación con Ollama.
- Control de contexto.
- Reglas de sistema.
- Manejo de memoria.
- Recuperación de historial.
- Integración con embeddings.
- Decisión de cuándo usar STT/TTS.
- Normalización de respuestas de IA.
- Registro de trazabilidad.

Este debe ser el único servicio que habla directamente con Ollama.

No se debe permitir que Web, API Gateway, STT o TTS llamen directamente a Ollama.

## 5.4 STT Service

Servicio independiente en Python para Speech-to-Text.

Tecnología recomendada:

```txt
Python
FastAPI
Uvicorn
Whisper / faster-whisper / modelo equivalente
```

Responsabilidades:

- Recibir audio.
- Validar formato.
- Transcribir audio a texto.
- Retornar texto limpio.
- Manejar duración máxima.
- Manejar errores de audio.
- Registrar tiempo de procesamiento.

No debe:

- Generar respuestas IA.
- Guardar conversaciones.
- Manejar usuarios.
- Llamar a Ollama.
- Hacer lógica de negocio.

## 5.5 TTS Service

Servicio independiente en Python para Text-to-Speech.

Tecnología recomendada:

```txt
Python
FastAPI
Uvicorn
Coqui TTS / Piper / modelo TTS elegido
```

Responsabilidades:

- Recibir texto.
- Generar audio.
- Permitir selección de voz.
- Retornar archivo o stream de audio.
- Guardar temporalmente audios si aplica.
- Optimizar tiempos de respuesta.

No debe:

- Decidir qué responde la IA.
- Manejar autenticación.
- Guardar conversaciones.
- Llamar a Ollama.

## 5.6 Worker Service

Servicio para trabajos pesados o asincrónicos.

Responsabilidades:

- Procesamiento de audios largos.
- Generación de embeddings.
- Limpieza de archivos temporales.
- Indexación de documentos.
- Reintentos de tareas.
- Procesos batch.
- Generación diferida de TTS.
- Resúmenes largos.
- Tareas programadas.

Tecnologías recomendadas:

```txt
BullMQ
Redis
Node.js/TypeScript
```

También puede existir un worker Python si las tareas son más cercanas a IA/audio.

## 6. Bases de datos

## 6.1 PostgreSQL

PostgreSQL será la base de datos principal.

Debe usarse para datos estructurados y transaccionales.

Guardar aquí:

- Usuarios.
- Roles.
- Permisos.
- Organizaciones.
- Planes.
- Configuraciones.
- Sesiones.
- Conversaciones principales.
- Referencias a mensajes.
- Auditoría.
- Configuración de modelos.
- Historial resumido.
- Facturación futura.
- Tenants si el sistema escala a multiempresa.

PostgreSQL manda en todo lo que necesite consistencia.

## 6.2 MongoDB

MongoDB debe usarse solo para contenido flexible.

Guardar aquí:

- Mensajes largos.
- Payloads de IA.
- Trazas de conversación.
- Metadata variable.
- Documentos semiestructurados.
- Resultados de análisis.
- Logs enriquecidos de interacción.
- Memorias flexibles de usuario.

No debe usarse para reemplazar PostgreSQL.

Error grave:

```txt
Guardar usuarios en PostgreSQL y también duplicarlos en MongoDB sin una razón clara.
```

Eso rompe consistencia y crea deuda técnica.

## 6.3 Redis

Redis debe usarse para:

- Caché.
- Rate limit.
- Colas.
- Estados temporales.
- Locks.
- Sesiones temporales.
- Control de jobs.
- Tokens de corta vida.
- Control de procesamiento de audio.

Redis no debe usarse como base de datos principal.

## 7. Ollama

Ollama debe tratarse como infraestructura interna de inferencia.

Debe estar detrás del AI Orchestrator.

Uso recomendado:

```txt
Web
 ↓
API Gateway
 ↓
AI Orchestrator
 ↓
Ollama
```

No recomendado:

```txt
Web → Ollama
API Gateway → Ollama desde todos lados
STT → Ollama
TTS → Ollama
```

## 7.1 Modelos sugeridos

Para una primera versión:

```txt
llama3.2:1b       -> respuestas rápidas
llama3.2:3b       -> respuestas más profundas
embeddinggemma    -> embeddings
```

## 7.2 Reglas para usar modelos

Definir una tabla o configuración así:

```txt
fast_model       = llama3.2:1b
deep_model       = llama3.2:3b
embedding_model  = embeddinggemma
default_model    = llama3.2:1b
```

No quemar nombres de modelos en controladores.

Centralizar la selección de modelo en el AI Orchestrator.

## 8. Flujo principal de texto

```txt
Usuario escribe mensaje
 ↓
Web envía request
 ↓
API Gateway valida usuario y permisos
 ↓
AI Orchestrator construye prompt
 ↓
AI Orchestrator llama a Ollama
 ↓
Se guarda conversación
 ↓
API Gateway responde al cliente
 ↓
Web muestra respuesta
```

## 9. Flujo principal de voz

```txt
Usuario graba audio
 ↓
Web envía audio al API Gateway
 ↓
Gateway valida tamaño, usuario y permisos
 ↓
STT Service transcribe audio
 ↓
AI Orchestrator genera respuesta con Ollama
 ↓
TTS Service convierte respuesta a audio
 ↓
Gateway devuelve texto + audio
 ↓
Web reproduce respuesta
```

## 10. Flujo con jobs asincrónicos

Para audios largos o tareas pesadas:

```txt
Web envía audio
 ↓
API Gateway registra job
 ↓
Worker toma el job desde Redis
 ↓
STT procesa audio
 ↓
AI Orchestrator genera respuesta
 ↓
TTS genera audio
 ↓
Resultado queda disponible
 ↓
Web consulta estado o recibe evento
```

## 11. Comunicación entre servicios

Para MVP:

```txt
HTTP interno
```

Para crecimiento:

```txt
HTTP + Redis/BullMQ
```

Para arquitectura más avanzada:

```txt
gRPC para servicios internos críticos
Eventos para tareas asincrónicas
```

Recomendación inicial:

- No empezar con gRPC.
- No empezar con Kubernetes.
- No empezar con microservicios excesivos.
- Empezar modular, preparado para separar más después.

## 12. Streaming

Para chat con IA se recomienda:

```txt
SSE para streaming de texto
WebSocket si habrá interacción bidireccional compleja
```

Para primera versión:

```txt
SSE
```

WebSocket solo si necesitas:

- Sala en vivo.
- Voz en tiempo real.
- Estado bidireccional constante.
- Múltiples eventos simultáneos.

## 13. Seguridad

## 13.1 Reglas básicas

- JWT con refresh token.
- Rate limiting por usuario e IP.
- Validación de tamaño de audio.
- Validación de formatos permitidos.
- Sanitización de inputs.
- Logs de auditoría.
- Control de permisos.
- No exponer Ollama públicamente.
- No exponer MongoDB, PostgreSQL ni Redis.
- Variables sensibles solo por `.env`.
- Separar secretos por ambiente.

## 13.2 Endpoints protegidos

Deben estar protegidos:

```txt
/chat
/chat/stream
/audio/transcribe
/audio/synthesize
/conversations
/profile
/admin
/models
```

## 13.3 Endpoints públicos

Solo deberían ser públicos:

```txt
/health
/auth/login
/auth/register si aplica
/auth/refresh
```

## 14. Observabilidad

Desde el inicio se debe guardar:

- Request ID.
- Usuario.
- Modelo usado.
- Tiempo de respuesta.
- Tokens aproximados si aplica.
- Duración del audio.
- Tiempo de STT.
- Tiempo de TTS.
- Errores por servicio.
- Estado de jobs.
- Latencia de Ollama.
- Logs por conversación.

No construir observabilidad después. Después duele más.

## 15. Docker Compose recomendado

Servicios mínimos:

```txt
postgres
mongo
redis
ollama
api-gateway
stt-service
tts-service
ai-orchestrator
web
nginx
```

Para desarrollo puedes levantar infraestructura y ejecutar apps localmente:

```txt
docker compose up postgres mongo redis ollama
pnpm nx serve api-gateway
pnpm nx serve web
```

## 16. Variables de entorno sugeridas

```env
NODE_ENV=development

DATABASE_URL=postgresql://user:password@localhost:5432/ai_platform
MONGO_URL=mongodb://localhost:27017/ai_platform
REDIS_URL=redis://localhost:6379

OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_FAST_MODEL=llama3.2:1b
OLLAMA_DEEP_MODEL=llama3.2:3b
OLLAMA_EMBEDDING_MODEL=embeddinggemma

STT_SERVICE_URL=http://localhost:7001
TTS_SERVICE_URL=http://localhost:7002
AI_ORCHESTRATOR_URL=http://localhost:7003

JWT_SECRET=change_me
JWT_REFRESH_SECRET=change_me
MAX_AUDIO_SIZE_MB=25
```

## 17. Endpoints sugeridos

## API Gateway

```txt
GET    /health
POST   /auth/login
POST   /auth/refresh
POST   /chat
GET    /chat/stream
POST   /audio/transcribe
POST   /audio/synthesize
GET    /conversations
GET    /conversations/:id
DELETE /conversations/:id
GET    /models
```

## STT Service

```txt
GET  /health
POST /transcribe
```

## TTS Service

```txt
GET  /health
POST /synthesize
```

## AI Orchestrator

```txt
GET  /health
POST /generate
POST /generate/stream
POST /embedding
POST /memory/search
POST /memory/save
```

## 18. Reglas de arquitectura

## 18.1 Reglas duras

1. La web nunca llama directo a Ollama.
2. La web nunca accede directo a bases de datos.
3. STT solo transcribe.
4. TTS solo genera audio.
5. El API Gateway no debe contener lógica profunda de IA.
6. El AI Orchestrator es el único que habla con Ollama.
7. PostgreSQL es la fuente de verdad transaccional.
8. MongoDB es para contenido flexible.
9. Redis es para caché, colas y estado temporal.
10. Todo servicio debe tener `/health`.
11. Todo request importante debe tener logs.
12. Todo audio debe tener límite de tamaño y duración.
13. Los modelos no se queman en controladores.
14. Los prompts base deben versionarse.
15. Cada servicio debe poder correr en Docker.

## 18.2 Reglas de código

- TypeScript estricto.
- DTOs compartidos.
- Validación con Zod o class-validator.
- Separación por módulos.
- No lógica de negocio en controladores.
- No queries SQL crudas sin necesidad.
- No dependencias innecesarias.
- No mezclar responsabilidades.
- No duplicar tipos entre servicios.
- No usar librerías abandonadas.

## 19. Fases de implementación

## Fase 1: Base del monorepo

Duración máxima: 1 día.

Entregables:

- Crear workspace Nx.
- Configurar pnpm.
- Crear `apps/web`.
- Crear `apps/api-gateway`.
- Crear `services/stt-service`.
- Crear `services/tts-service`.
- Crear `services/ai-orchestrator`.
- Crear `infra/docker-compose.yml`.
- Crear documentación inicial.

## Fase 2: Infraestructura local

Duración máxima: 1 día.

Entregables:

- PostgreSQL funcionando.
- MongoDB funcionando.
- Redis funcionando.
- Ollama funcionando.
- Healthchecks.
- Variables de entorno.
- README de ejecución local.

## Fase 3: Gateway básico

Duración máxima: 2 días.

Entregables:

- `/health`.
- Auth inicial.
- Rate limit.
- Validación.
- Proxy interno hacia servicios.
- Manejo global de errores.
- Logs básicos.

## Fase 4: Servicios STT y TTS mock

Duración máxima: 2 días.

Entregables:

- STT con endpoint `/transcribe`.
- TTS con endpoint `/synthesize`.
- Respuestas mock.
- Dockerfile por servicio.
- Healthcheck por servicio.

## Fase 5: Ollama + AI Orchestrator

Duración máxima: 2 días.

Entregables:

- AI Orchestrator conectado a Ollama.
- Selección de modelo.
- Prompt base.
- Endpoint `/generate`.
- Endpoint `/generate/stream`.
- Guardado inicial de conversación.

## Fase 6: Web funcional

Duración máxima: 3 días.

Entregables:

- Login.
- Pantalla de chat.
- Envío de texto.
- Respuesta IA.
- Historial básico.
- Streaming si aplica.
- Grabación de audio mock.

## Fase 7: Voz real

Duración máxima: 5 días.

Entregables:

- STT real.
- TTS real.
- Flujo completo voz → texto → IA → audio.
- Límites de audio.
- Manejo de errores.
- Pruebas con audios reales.

## Fase 8: Jobs y escalabilidad

Duración máxima: 5 días.

Entregables:

- BullMQ.
- Redis queues.
- Worker service.
- Procesamiento asincrónico.
- Estado de jobs.
- Reintentos.
- Limpieza de archivos temporales.

## Fase 9: Deploy VPS

Duración máxima: 3 días.

Entregables:

- Docker Compose productivo.
- Nginx.
- HTTPS.
- Variables de producción.
- Logs persistentes.
- Backups de PostgreSQL.
- Backups de MongoDB.
- Servicio Ollama protegido.

## 20. Roadmap corto

## Hoy

- Crear el monorepo Nx.
- Crear estructura de carpetas.
- Crear Docker Compose con PostgreSQL, MongoDB, Redis y Ollama.
- Crear healthcheck del API Gateway.

## En 48 horas

- API Gateway arriba.
- STT mock arriba.
- TTS mock arriba.
- AI Orchestrator conectado a Ollama.
- Web consumiendo `/chat`.

## En 7 días

- Login básico.
- Chat funcional.
- Streaming.
- Conversaciones guardadas.
- STT real.
- TTS real.

## En 14 días

- Voz completa.
- Jobs asincrónicos.
- Logs.
- Deploy en VPS.
- Nginx + HTTPS.
- Primera demo estable.

## 21. Decisión final

La arquitectura correcta es:

```txt
Nx Monorepo
├── Web
├── API Gateway TypeScript
├── AI Orchestrator
├── STT Python Service
├── TTS Python Service
├── Worker Service
├── PostgreSQL
├── MongoDB
├── Redis
└── Ollama
```

No perder tiempo comparando herramientas durante semanas.

La decisión es Nx.

El siguiente paso es construir el esqueleto y validar el flujo mínimo:

```txt
Web → Gateway → AI Orchestrator → Ollama → Respuesta
```

Después se agrega:

```txt
Audio → STT → IA → TTS → Audio
```

## 22. Advertencia final

El riesgo real no está en elegir Nx o Turborepo.

El riesgo real es quedarse diseñando y no construir.

Si el proyecto no tiene un flujo funcional en 7 días, el problema no será la arquitectura. Será falta de ejecución.
