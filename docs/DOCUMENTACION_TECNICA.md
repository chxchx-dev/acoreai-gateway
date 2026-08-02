# ACoreAI Gateway — Documentación técnica general

> Documento de referencia del estado actual del proyecto. Describe la implementación encontrada en el repositorio y separa las capacidades disponibles de las mejoras pendientes.

## 1. Resumen ejecutivo

ACoreAI Gateway es un backend centralizado construido con NestJS y TypeScript que funciona como puerta de entrada segura hacia modelos de lenguaje servidos por Ollama. El gateway concentra la lógica de inteligencia artificial, autenticación, conversaciones, recuperación semántica de conocimiento, traducción, voz, observabilidad y reglas de negocio.

El repositorio incluye dos interfaces web:

- **ACoreAI Web:** interfaz de chat y práctica de idiomas.
- **Knowledge Admin:** panel administrativo para gestionar fuentes de conocimiento, revisiones, publicación, auditoría y procesos de automatización.

La arquitectura está preparada para reutilizar el gateway con distintas aplicaciones cliente, mientras que el modelo Ollama puede ejecutarse en un servidor separado. La solución se despliega con Docker Compose.

## 2. Qué se ha realizado

### 2.1 Gateway de inteligencia artificial

Se implementó un servicio NestJS que:

- Recibe peticiones HTTP desde las aplicaciones web y clientes externos.
- Valida una clave interna de gateway (`AI_GATEWAY_KEY`).
- Valida usuarios mediante JWT y sesiones de refresh token.
- Resuelve el modelo y sus límites según el rol y la plataforma de origen.
- Consume Ollama mediante HTTP, sin acoplar la aplicación directamente a un modelo específico.
- Soporta respuestas completas y streaming SSE token a token.
- Registra métricas, tiempos de respuesta, errores y actividad de los modelos.

### 2.2 Chat y conversaciones

El chat principal permite:

- Preguntas y respuestas con modelos locales/remotos de Ollama.
- Conversaciones persistentes por usuario.
- Historial reciente y resumen de conversaciones largas.
- Títulos editables y eliminación de conversaciones.
- Prompts educativos y prompts de perspectivas.
- Uso opcional o automático de RAG según el flujo configurado.
- Respuestas en Markdown.

También existe un flujo específico de chat RAG que devuelve contexto y fuentes asociadas a la respuesta.

### 2.3 RAG supervisado y Centro de Conocimiento

El proyecto contiene un sistema de RAG supervisado. La idea no es entrenar automáticamente el modelo, sino gobernar qué información puede consultar:

```text
Fuente → extracción → limpieza → chunking → revisión humana
       → aprobación → embeddings → publicación → búsqueda en chat
```

Se implementaron entidades y servicios para:

- Crear fuentes de conocimiento.
- Extraer texto de PDF, DOCX, Excel, CSV, HTML y URLs.
- Generar versiones de una fuente.
- Dividir documentos en fragmentos o chunks.
- Detectar advertencias y datos sensibles.
- Revisar, aprobar, rechazar o solicitar cambios.
- Generar embeddings con Ollama.
- Buscar usando PostgreSQL y pgvector.
- Filtrar por estado publicado, vigencia, idioma y área.
- Guardar fuentes citables en la respuesta.
- Registrar búsquedas sin respuesta.
- Auditar cambios y acciones administrativas.
- Vigilar URLs para detectar cambios y crear nuevas versiones pendientes de revisión.

El chat de conocimiento no debe consultar documentos en borrador, pendientes de revisión, rechazados, archivados o vencidos. La búsqueda productiva está pensada para usar únicamente fuentes `published` y vigentes.

### 2.4 Autenticación y seguridad

Se implementaron:

- Usuarios con roles `FREE`, `ACADEMIC`, `PLUS` y `ADMIN`.
- Access tokens JWT de corta duración.
- Refresh tokens persistidos como hash y revocables.
- Hash de contraseñas con Argon2.
- Recuperación y cambio de contraseña.
- Control de dispositivo y posibilidad de liberar dispositivos.
- Guards para API key, JWT, administrador, trial, conocimiento y automatización.
- Helmet para headers HTTP de seguridad.
- CORS configurable.
- Rate limiting de peticiones.
- Separación entre la clave interna del gateway y el navegador: la clave debe inyectarse en el proxy/Nginx, no exponerse al frontend.

### 2.5 Voz, traducción y trial

El gateway integra servicios auxiliares Python:

- **TTS:** FastAPI con `edge-tts`, con respuesta de audio y caché.
- **STT:** FastAPI con `faster-whisper`, modelo configurable, para transcribir archivos de audio.
- **Traducción:** uso de Ollama y modelos de traducción para traducir a varios idiomas.
- **Trial:** chat limitado para usuarios anónimos en la landing page.

### 2.6 Aprendizaje de idiomas y Adventure Mode

Existe un módulo educativo con:

- Perfil de idioma por usuario.
- Nivel, XP total y transacciones de XP.
- Lecciones y progreso.
- Exámenes, intentos, puntuación y retroalimentación.
- Títulos desbloqueables.
- Fases de aventura.
- Niveles ocultos.
- Memoria de temas usados.
- Registro de intentos por pregunta.
- Generación de contenido educativo con IA.

Las reglas de negocio incluyen cálculo de subida de nivel, recompensas por lecciones/exámenes/niveles ocultos y límites de intentos de examen.

### 2.7 Automatización de procesos

Se creó la estructura de datos y el panel para describir procedimientos automatizables:

- Procesos.
- Pasos ordenados.
- Campos requeridos y opcionales.
- Reglas.
- Plantillas de payload.
- Checklists antes y después.
- Logs de ejecución.

Importante: actualmente este módulo modela y administra el procedimiento, pero no ejecuta acciones reales mediante Playwright, Puppeteer u otro navegador automatizado. El ejecutor es una capacidad futura.

## 3. Tecnologías utilizadas

| Área | Tecnología |
|---|---|
| Backend | NestJS 10, TypeScript, Node.js |
| API | Express, DTOs, class-validator, class-transformer |
| LLM | Ollama remoto por HTTP |
| Modelos previstos | llama3.2, qwen3, modelos de traducción y embeddings |
| Base relacional | PostgreSQL 16 |
| Búsqueda vectorial | pgvector |
| ORM | Prisma 5 |
| Historial/caché | MongoDB 7 |
| Autenticación | JWT, Argon2, sesiones persistidas |
| Frontend | React, Vite, TypeScript |
| UI admin | TailwindCSS, React Router, React Query, React Hook Form, Zod |
| TTS | Python, FastAPI, edge-tts |
| STT | Python, FastAPI, faster-whisper |
| Observabilidad | Pino, pino-http, Prometheus, prom-client |
| Seguridad HTTP | Helmet, throttling, CORS |
| Infraestructura | Docker, Docker Compose, Nginx |
| Migraciones | Prisma Migrate |

## 4. Arquitectura general

```text
┌──────────────────┐       ┌──────────────────┐
│ ACoreAI Web         │       │ Knowledge Admin   │
│ React + Vite     │       │ React + Vite     │
└────────┬─────────┘       └────────┬─────────┘
         └──────────────┬───────────┘
                        ▼
              ┌────────────────────┐
              │ ACoreAI Gateway       │
              │ NestJS + TypeScript│
              └─────┬──────┬───────┘
                    │      │
        ┌───────────┘      └────────────┐
        ▼                              ▼
┌───────────────┐                ┌───────────────┐
│ PostgreSQL    │                │ MongoDB       │
│ Prisma/pgvector│                │ historial/cache│
└──────┬────────┘                └───────────────┘
       │
       ▼
┌───────────────┐       ┌───────────────┐
│ Ollama remoto │       │ TTS/STT Python│
└───────────────┘       └───────────────┘

              ┌────────────────────┐
              │ Knowledge Admin    │
              │ React + Vite       │
              └────────────────────┘
```

## 5. Organización del código

```text
src/
├── domain/              Reglas de negocio y tipos independientes
├── application/         Casos de uso, contratos, puertos y servicios
├── infrastructure/      Prisma, MongoDB, Ollama, pgvector y métricas
├── interfaces/http/     Controllers, DTOs, guards, filtros e interceptores
├── modules/             Módulos funcionales de NestJS
└── config/              Configuración y validación de entorno

web/
├── acoreai/                Aplicación web ACoreAI
├── acoreai/              Aplicación web ACoreAI
└── admin/               Panel de administración del conocimiento

services/
├── stt/                 Servicio Python de voz a texto
└── tts/                 Servicio Python de texto a voz

prisma/
├── schema.prisma        Modelo de datos
├── migrations/           Historial de migraciones
└── seeds/               Datos iniciales
```

La estructura sigue una combinación de Clean Architecture, arquitectura modular de NestJS y Ports & Adapters:

- El dominio contiene reglas que no deberían depender de bases de datos o HTTP.
- La aplicación define casos de uso y puertos como `LlmPort` y `VectorStorePort`.
- La infraestructura implementa esos puertos con Ollama y pgvector.
- La capa HTTP traduce peticiones externas a DTOs y llama los casos de uso.
- Los módulos agrupan capacidades de negocio como chat, RAG, auth, idiomas y conocimiento.

## 6. Flujo de una petición de chat

```text
Cliente
  ↓
API key interna
  ↓
JWT y resolución de usuario/rol
  ↓
DTO y validaciones
  ↓
Política de modelo
  ↓
Historial de conversación
  ↓
Clasificación de necesidad de RAG
  ↓
Embedding y búsqueda vectorial, si aplica
  ↓
Construcción del prompt
  ↓
Ollama
  ↓
Respuesta normal o SSE
  ↓
Persistencia, auditoría y métricas
```

El clasificador de RAG utiliza un modelo pequeño (`llama3.2:1b`), temperatura cero, caché temporal de resultados y una política conservadora: si la respuesta del clasificador es ambigua o falla, se intenta buscar contexto.

## 7. Algoritmos y lógica principal

### 7.1 Generación de texto

El gateway no entrena modelos propios. Envía mensajes y opciones a Ollama y recibe texto completo o fragmentos de streaming. La especialización se logra con prompts, políticas, historial y contexto RAG.

### 7.2 Clasificación de necesidad de RAG

Se solicita a un modelo pequeño que responda `SI` o `NO` según la pregunta necesite conocimiento institucional. El resultado se almacena en una caché en memoria durante cinco minutos, con máximo de 500 entradas.

Esto es clasificación binaria basada en prompting, no un clasificador estadístico entrenado.

### 7.3 Chunking de documentos

Hay dos estrategias:

1. Chunking general por párrafos, con división adicional por oraciones cuando un párrafo supera el tamaño permitido.
2. Chunking de conocimiento consciente de encabezados Markdown, con aproximadamente 700 tokens por chunk, solapamiento aproximado de 120 tokens y repetición del título de sección.

El cálculo de tokens es una aproximación de cuatro caracteres por token en español; no se utiliza un tokenizer real.

### 7.4 Embeddings y búsqueda semántica

La pregunta se transforma en un vector mediante Ollama. PostgreSQL/pgvector compara ese vector con los embeddings de los chunks usando distancia coseno:

```text
similarity = 1 - distancia_coseno
```

La búsqueda recupera candidatos y luego filtra los que estén por debajo de `RAG_MIN_SCORE` (por defecto 0.35). El score final combina:

```text
score = similitud * 0.70
      + prioridad normalizada * 0.15
      + frescura * 0.10
      + coincidencia de área * 0.05
```

Después se ordena por score y se limita a los mejores resultados (`RAG_TOP_K`, por defecto 6).

### 7.5 Versionado y publicación del conocimiento

Las fuentes tienen estados de ciclo de vida. Una fuente puede pasar por extracción, chunking, revisión, aprobación, generación de embeddings y publicación. La aprobación y la publicación son pasos independientes para evitar que contenido no revisado llegue al chat.

### 7.6 Progresión de idiomas

El XP se acumula y se consume para subir de nivel. El costo por nivel aumenta por rangos:

- Niveles menores de 10: 100 XP.
- Menores de 20: 150 XP.
- Menores de 50: 200 XP.
- Menores de 100: 250 XP.
- Desde 100: 300 XP.

El algoritmo permite subir varios niveles si una sola actividad entrega suficiente XP.

### 7.7 Caché y persistencia

- Historial caliente y cachés de audio: MongoDB con TTL.
- Fuente de verdad de usuarios, conversaciones, auditoría, documentos y progreso educativo: PostgreSQL.
- Lista de modelos y clasificación de preguntas: cachés en memoria con TTL.

## 8. Modelo de datos principal

| Grupo | Entidades principales |
|---|---|
| Usuarios | `User`, `AuthSession`, dispositivos y roles |
| Chat | `AiConversation`, `AiConversationMessage`, `AiChatLog` |
| Documentos RAG básico | documentos, chunks y embeddings |
| Knowledge Center | `KnowledgeSource`, versiones, chunks, reviews, jobs, auditoría y watchers |
| Idiomas | perfiles, fases, lecciones, progreso, exámenes, XP, títulos y memoria de temas |
| Automatización | procesos, pasos, campos, reglas, plantillas, checklists y logs |
| Traducción | traducciones guardadas y caché |

PostgreSQL usa migraciones Prisma y columnas vectoriales de 768 dimensiones para embeddings. El esquema contiene además información de vigencia, prioridad, estados y trazabilidad para el RAG supervisado.

## 9. Interfaces y endpoints principales

### Chat y conversaciones

- `POST /api/chat`
- `POST /api/chat/stream`
- `POST /api/chat/perspectives/stream`
- `GET /api/conversations`
- `GET /api/conversations/:id/messages`
- `PATCH /api/conversations/:id/title`
- `DELETE /api/conversations/:id`

### RAG y conocimiento

- `POST /api/rag/search`
- `POST /api/chat/rag`
- Endpoints de fuentes, versiones, chunks, revisión, publicación, auditoría, watchers y preguntas sin respuesta.

### Servicios de IA

- `POST /api/translate`
- `POST /api/tts`
- `POST /api/stt`
- `GET /api/ollama/models`

### Seguridad y sistema

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `POST /api/trial/chat`
- `GET /health/live`
- `GET /health/ready`
- `GET /metrics`

## 10. Despliegue

Servicios definidos en Docker Compose:

| Servicio | Responsabilidad |
|---|---|
| `acoreai-gateway` | API NestJS |
| `acoreai-ai-postgres` | PostgreSQL con pgvector |
| `acoreai-ai-mongodb` | Historial y caché |
| `acoreai-tts` | Servicio de texto a voz |
| `acoreai-stt` | Servicio de voz a texto |
| `acoreai-web` | Web ACoreAI servida por Nginx |
| `acoreai-web` | Web ACoreAI servida por Nginx |
| admin web | Panel administrativo, con configuración de desarrollo y producción |

Ollama no está incluido en el Compose principal: se consume desde `MODEL_SERVER_URL`. En desarrollo puede ejecutarse en la máquina anfitriona; en producción se recomienda un servidor dedicado con GPU o recursos suficientes.

Comandos habituales:

```bash
pnpm install
pnpm build
pnpm exec prisma generate
pnpm exec prisma migrate dev
docker compose up -d --build
docker compose logs -f acoreai-gateway
```

## 11. Observabilidad

El sistema incluye:

- `x-request-id` por petición.
- Logs JSON con Pino.
- Métricas Prometheus en `/metrics`.
- Duración y errores HTTP por ruta.
- Métricas de Ollama y tokens.
- Duración de RAG, MongoDB, TTS y STT.
- Conteo de streams SSE activos.
- Logs de búsqueda y preguntas sin respuesta.
- Auditoría de cambios administrativos y del conocimiento.

## 12. Estado actual: implementado, parcial y pendiente

### Implementado o muy avanzado

- Gateway NestJS modular.
- Chat normal y streaming.
- Integración con Ollama.
- Autenticación JWT y sesiones.
- Conversaciones y persistencia.
- PostgreSQL, Prisma y MongoDB.
- RAG con embeddings y pgvector.
- Flujo de conocimiento supervisado.
- Panel administrativo.
- Traducción, TTS y STT.
- Observabilidad y controles de seguridad.
- Modelo de datos de aprendizaje de idiomas.
- Modelo administrativo de automatizaciones.

### Parcial o requiere validación funcional

- Hay dos pipelines de chat: uno general y otro RAG. Sus reglas históricas no son idénticas.
- El historial se resume y trunca por tamaño; todavía no se selecciona semánticamente por relevancia.
- La calidad de extracción depende del tipo de archivo y de que el PDF no sea una imagen escaneada.
- La experiencia de administración debe probarse con datos reales y todos los estados del workflow.
- La integración con la aplicación móvil debe validarse desde el cliente real, no solo desde la interfaz web.

### No implementado todavía

- Fine-tuning de modelos propios.
- Function calling o herramientas reales para que el modelo ejecute acciones.
- Ejecutor de automatizaciones con navegador o APIs externas.
- Aprendizaje autónomo del modelo a partir de conversaciones.
- Selección semántica avanzada del historial.
- Evaluación automática de calidad, groundedness y alucinaciones.

## 13. Mejoras recomendadas

### Prioridad alta

1. **Unificar los pipelines de chat.** Definir un único orquestador para historial, decisión de RAG, construcción de prompt, respuesta y persistencia.
2. **Cerrar el contrato del RAG.** Asegurar que todas las rutas filtren siempre por `published`, vigencia, idioma, área y permisos.
3. **Pruebas automatizadas.** Añadir unit tests para políticas, chunking, score RAG, auth, XP y publicación; además de pruebas e2e para login, chat y workflow de conocimiento.
4. **Validar producción.** Probar recuperación ante caída de Ollama, MongoDB, PostgreSQL, TTS y STT, incluyendo timeouts y mensajes degradados.
5. **Revisar secretos.** Mantener claves, passwords y URLs sensibles fuera del repositorio y rotarlas por entorno.
6. **Definir estrategia de almacenamiento de archivos.** Para producción, migrar de disco local a almacenamiento S3 compatible o equivalente.

### Prioridad media

1. Implementar re-ranking de resultados RAG para mejorar precisión.
2. Añadir evaluación offline con preguntas esperadas, precisión de recuperación y respuestas fundamentadas.
3. Añadir citas visibles y consistentes en todos los flujos que usen conocimiento.
4. Mejorar extracción de tablas, OCR y documentos escaneados.
5. Separar colas de trabajos pesados usando Redis/BullMQ u otro sistema equivalente.
6. Añadir paginación, filtros y permisos más finos en el panel administrativo.
7. Incorporar circuit breakers y reintentos controlados para dependencias externas.

### Prioridad futura

1. Implementar herramientas estructuradas y function calling con validación estricta.
2. Crear un ejecutor seguro de automatizaciones con dry-run, idempotencia y aprobación humana.
3. Introducir selección semántica de memoria e historial.
4. Evaluar modelos especializados o fine-tuning solo después de reunir datos etiquetados y métricas de éxito.
5. Añadir multi-tenant si una misma instalación debe aislar datos de varias organizaciones.

## 14. Riesgos técnicos a controlar

- **Alucinaciones:** el LLM puede responder con información no respaldada si el prompt no fuerza el uso de contexto.
- **Documentos obsoletos:** se deben respetar fechas de vigencia y publicación.
- **Coste computacional:** STT, embeddings y modelos grandes pueden consumir mucha RAM/CPU/GPU.
- **Bloqueo de peticiones:** extracción, embeddings y resúmenes no deberían ejecutarse indefinidamente dentro de una request HTTP.
- **Duplicación de lógica:** dos flujos de chat pueden evolucionar de manera inconsistente.
- **Seguridad de archivos:** las cargas deben validar tamaño, extensión, MIME, contenido y almacenamiento.
- **Datos sensibles:** documentos, conversaciones y audio requieren políticas de retención y acceso.
- **Cambios de modelos:** cambiar de modelo puede alterar dimensiones de embeddings, calidad y comportamiento de prompts.

## 15. Recomendación de mantenimiento

Para cada nueva capacidad se recomienda seguir este orden:

1. Definir el caso de uso y sus permisos.
2. Definir contrato DTO y respuesta.
3. Implementar regla de dominio o caso de uso.
4. Implementar persistencia y migración.
5. Añadir logs, métricas y manejo de errores.
6. Añadir pruebas unitarias y e2e.
7. Integrar frontend y documentar el endpoint.
8. Verificar Docker y variables de entorno.

## 16. Conclusión

El proyecto ya constituye una plataforma de IA modular, no solo un chatbot: tiene gateway, autenticación, persistencia, RAG supervisado, administración del conocimiento, multimodalidad de voz, traducción y una base educativa para idiomas.

La principal mejora arquitectónica recomendada es consolidar el orquestador de chat y fortalecer pruebas, colas de procesamiento y evaluación de calidad. El sistema debe presentarse como **RAG supervisado** y no como fine-tuning o aprendizaje autónomo, porque actualmente el conocimiento se recupera en tiempo de consulta y se controla mediante revisión y publicación.
