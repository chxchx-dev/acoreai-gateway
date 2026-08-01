# Estructura de bases de datos - Olan AI Gateway

Estado despues del cambio: los logs de chat ya no se escriben en PostgreSQL. A partir de este punto se guardan en MongoDB, en la coleccion `chat_logs`.

## PostgreSQL

PostgreSQL queda como base relacional y persistencia durable para autenticacion, RAG, conversaciones, traducciones y perfil IA.

Datasource Prisma:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### Tablas actuales

#### `User`

Usuarios propios del gateway.

Campos principales:

- `id`
- `email`
- `passwordHash`
- `name`
- `role`: `FREE`, `ACADEMIC`, `PLUS`, `ADMIN`
- `createdAt`
- `updatedAt`

Uso:

- Login.
- Usuarios admin/academicos.
- Relacion con sesiones de refresh token.

#### `AuthSession`

Sesiones de refresh token.

Campos principales:

- `id`
- `userId`
- `refreshTokenHash`
- `expiresAt`
- `revokedAt`
- `createdAt`
- `updatedAt`

Uso:

- Renovar JWT.
- Revocar sesiones.
- Mantener refresh tokens hasheados.

#### `AiDocument`

Documento base para RAG.

Campos principales:

- `id`
- `title`
- `type`
- `source`
- `createdAt`
- `updatedAt`

Uso:

- Catalogar documentos cargados para busqueda semantica.

#### `AiDocumentChunk`

Fragmentos de documentos RAG.

Campos principales:

- `id`
- `documentId`
- `chunkIndex`
- `content`
- `metadata`
- `createdAt`

Uso:

- Dividir documentos en partes consultables.
- Relacion con embeddings.

#### `AiDocumentEmbedding`

Embeddings vectoriales en pgvector.

Campos principales:

- `id`
- `chunkId`
- `model`
- `dimensions`
- `embedding`: `vector(768)`
- `createdAt`

Uso:

- Busqueda semantica de chunks.
- Similaridad por vector con pgvector.

#### `AiConversation`

Conversaciones persistentes.

Campos principales:

- `id`
- `userId`
- `source`
- `title`
- `status`: usualmente `active` o `archived`
- `summary`
- `summaryUpdatedAt`
- `summarizedMessageCount`
- `createdAt`
- `updatedAt`

Uso:

- Historial durable de conversaciones.
- Recuperacion si Mongo expira o pierde cache.
- Resumen incremental de conversaciones largas.

#### `AiConversationMessage`

Mensajes persistentes de conversaciones.

Campos principales:

- `id`
- `conversationId`
- `role`: `user` o `assistant`
- `content`
- `model`
- `status`: `saved`, `error`, `no_context`
- `errorMessage`
- `sources`
- `chunksUsed`
- `createdAt`

Uso:

- Historial durable de mensajes.
- Contexto conversacional.
- Auditoria de respuestas asociadas a una conversacion.

#### `TranslationSave`

Traducciones guardadas por usuario.

Campos principales:

- `id`
- `userId`
- `title`
- `text`
- `translations`
- `langs`
- `createdAt`

Uso:

- Historial de traducciones guardadas.

#### `AiUserProfile`

Perfil IA del usuario.

Campos principales:

- `id`
- `userId`
- `preferredMode`
- `mainGoal`
- `englishLevel`
- `interestTopics`
- `correctionStyle`
- `practiceStyle`
- `onboardingCompleted`
- `createdAt`
- `updatedAt`

Uso:

- Personalizacion de experiencia IA.
- Onboarding de AlanIA / perfiles educativos.

### Nota sobre `AiChatLog`

Antes los logs se guardaban en PostgreSQL en `AiChatLog`.

Despues del cambio:

- El codigo ya no escribe logs en `AiChatLog`.
- El modulo `LogsService` ya no usa Prisma para logs.
- Los endpoints de `/logs` leen desde MongoDB.
- Si la tabla `AiChatLog` existe en una base vieja, queda como legado historico hasta que se decida migrar o borrar esos datos.
- No se agrego una migracion destructiva para borrar esa tabla, para evitar perdida accidental de historico.

## MongoDB

MongoDB queda como base operacional para cache temporal, limites trial, cache de perfiles y logs de chat.

Config:

- `MONGODB_URI`
- `MONGODB_DB`
- Default DB: `olan_ai_gateway`

### Colecciones actuales

#### `conversations`

Cache de conversaciones.

Campos principales:

- `id`
- `userId`
- `source`
- `title`
- `status`
- `summary`
- `summaryUpdatedAt`
- `summarizedMessageCount`
- `createdAt`
- `updatedAt`
- `expiresAt`

Indices:

- `id` unico
- `updatedAt`
- `userId + status + updatedAt`
- `source + status + updatedAt`
- `expiresAt` TTL

Uso:

- Cache rapida de conversaciones.
- TTL configurable con `CONVERSATION_TTL_SECONDS`.
- Si no existe en Mongo, se recarga desde PostgreSQL.

#### `conversation_messages`

Cache de mensajes de conversaciones.

Campos principales:

- `id`
- `conversationId`
- `role`
- `content`
- `model`
- `status`
- `errorMessage`
- `sources`
- `chunksUsed`
- `createdAt`
- `expiresAt`

Indices:

- `id` unico
- `conversationId + createdAt`
- `conversationId + createdAt desc`
- `expiresAt` TTL

Uso:

- Lectura rapida de mensajes recientes.
- Cache de historial conversacional.
- Si no hay cache, se recarga desde PostgreSQL.

#### `trial_usage`

Uso del trial anonimo.

Campos principales:

- `fingerprint`
- `count`
- `createdAt`
- `updatedAt`
- `expiresAt`

Indices:

- `fingerprint` unico
- `expiresAt` TTL

Uso:

- Limitar pruebas anonimas.
- Limite actual en codigo: 3 usos por 30 dias.

#### `ai_profiles`

Cache del perfil IA.

Campos principales:

- `userId`
- `preferredMode`
- `mainGoal`
- `englishLevel`
- `interestTopics`
- `correctionStyle`
- `practiceStyle`
- `onboardingCompleted`
- `createdAt`
- `updatedAt`
- `cachedAt`

Indices:

- `userId` unico

Uso:

- Lectura rapida del perfil IA.
- La persistencia principal sigue en PostgreSQL, tabla `AiUserProfile`.

#### `chat_logs`

Logs de chat. Esta es la nueva ubicacion oficial de los logs.

Campos principales:

- `id`
- `userId`
- `conversationId`
- `source`
- `question`
- `answer`
- `model`
- `status`
- `errorMessage`
- `durationMs`
- `chunksUsed`
- `sources`
- `createdAt`

Indices:

- `id` unico
- `userId + createdAt desc`
- `conversationId + createdAt`
- `status + createdAt desc`
- `source + createdAt desc`

Uso:

- Auditoria operacional de preguntas/respuestas.
- Consulta desde endpoints `/logs`.
- Agrupacion de logs por conversacion.
- Filtros por usuario, estado, source y conversacion.

## Flujo de datos despues del cambio

### Chat normal

1. El usuario envia una pregunta.
2. `ConversationsService` crea o resuelve la conversacion.
3. El mensaje del usuario se guarda en:
   - MongoDB: `conversation_messages`, como cache.
   - PostgreSQL: `AiConversationMessage`, como persistencia durable.
4. La respuesta del asistente se guarda igual:
   - MongoDB: `conversation_messages`.
   - PostgreSQL: `AiConversationMessage`.
5. El log operacional se guarda solo en:
   - MongoDB: `chat_logs`.

### Conversaciones

- PostgreSQL es la fuente durable.
- MongoDB es cache con TTL.
- Si Mongo no tiene una conversacion o mensajes recientes, el servicio los recupera desde PostgreSQL y recalienta la cache.

### Logs

- MongoDB es la fuente actual.
- PostgreSQL ya no recibe nuevos logs.
- Los endpoints de logs trabajan con `chat_logs`.

## Resumen de responsabilidades

| Dato | PostgreSQL | MongoDB |
| --- | --- | --- |
| Usuarios | Si | No |
| Refresh sessions | Si | No |
| Documentos RAG | Si | No |
| Chunks RAG | Si | No |
| Embeddings pgvector | Si | No |
| Conversaciones | Si, durable | Si, cache TTL |
| Mensajes de conversaciones | Si, durable | Si, cache TTL |
| Logs de chat | No para nuevos logs | Si, `chat_logs` |
| Traducciones guardadas | Si | No |
| Perfil IA | Si, durable | Si, cache |
| Trial usage | No | Si |

