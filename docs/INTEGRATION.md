# OLAN AI Gateway — Guía de Integración

Base URL en producción (VPS): `https://ai.tudominio.com`  
Base URL local (Docker): `http://localhost:4005`  
Demo interactivo: `http://localhost:4005/demo`

---

## Autenticación

Todas las rutas bajo `/api/*` requieren el header:

```
x-ai-gateway-key: <AI_GATEWAY_KEY>
```

Esta clave **nunca se expone al frontend**. Solo el backend de Olan la conoce.

---

## Variables de entorno requeridas en Olan

```env
OLAN_AI_GATEWAY_URL=https://ai.tudominio.com
OLAN_AI_GATEWAY_KEY=tu_clave_interna
OLAN_AI_MODEL=llama3.2:3b          # modelo por defecto
OLAN_AI_USE_RAG=false              # activar RAG si hay documentos cargados
```

---

## 1. Chat

### POST `/api/chat` — respuesta completa

```http
POST /api/chat
Content-Type: application/json
x-ai-gateway-key: <key>
```

**Body**

```json
{
  "question": "¿Qué es la fotosíntesis?",
  "model": "llama3.2:3b",
  "userId": "usuario-123",
  "conversationId": "uuid-opcional",
  "source": "olan-app",
  "useRag": false,
  "useHistory": true,
  "historyLimit": 10
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `question` | string | ✅ | Pregunta del usuario (máx 1000 chars) |
| `model` | string | ✅ | Nombre del modelo Ollama |
| `userId` | string | — | ID del usuario en Olan |
| `conversationId` | string | — | Para continuar una conversación. Si no se envía, se crea una nueva |
| `source` | string | — | Identificador del origen (`olan-app`, `olan-web`, etc.) |
| `useRag` | boolean | — | Buscar contexto en documentos indexados (default: `false`) |
| `useHistory` | boolean | — | Incluir historial reciente (default: `true`) |
| `historyLimit` | number | — | Mensajes de historial a incluir (0–30, default: 10) |

**Política de chat**

El gateway no acepta control libre de modelo, `system`, `keepAlive` ni opciones de Ollama desde el cliente. Cada request se normaliza por rol JWT o por `source` confiable del backend:

| Política | Modelos | Límite respuesta | Contexto | `system` custom |
|---|---|---:|---:|---|
| `FREE` | `llama3.2:1b` | 300 tokens | 2048 | No |
| `ACADEMIC` | `llama3.2:3b` | 700 tokens | 4096 | No |
| `PLUS` | `llama3.2:3b` | 900 tokens | 4096 | No |
| `ADMIN` | `llama3.2:3b`, `qwen3:4b` | 1200 tokens | 8192 | Sí |

Si llega `Authorization: Bearer`, el rol y `userId` salen del JWT. Sin JWT, `source` solo aplica políticas conocidas para backend interno; el default es `FREE`.

**Respuesta 200**

```json
{
  "answer": "La fotosíntesis es el proceso por el cual...",
  "model": "llama3.2:3b",
  "durationMs": 2340,
  "status": "answered",
  "sources": [],
  "conversationId": "550e8400-e29b-41d4-a716-446655440000",
  "messageId": "msg-uuid",
  "historyUsed": 4
}
```

| Campo `status` | Significado |
|---|---|
| `answered` | Respuesta generada correctamente |
| `no_context` | RAG activo pero sin documentos relevantes |
| `error` | El modelo no pudo responder |

---

### POST `/api/chat/stream` — streaming SSE

Mismos campos en el body. La respuesta llega como **Server-Sent Events**.

```http
POST /api/chat/stream
Content-Type: application/json
x-ai-gateway-key: <key>
```

**Eventos SSE**

```
event: token
data: {"token": "La "}

event: token
data: {"token": "fotosíntesis "}

event: done
data: {"answer": "...", "conversationId": "uuid", "durationMs": 2100, "status": "answered", "sources": []}

event: error
data: {"message": "El modelo no respondió a tiempo."}
```

**Ejemplo JS (frontend Olan)**

```javascript
const res = await fetch('http://localhost:4005/api/chat/stream', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-ai-gateway-key': import.meta.env.VITE_GATEWAY_KEY,
  },
  body: JSON.stringify({ question, model, userId, conversationId }),
});

const reader = res.body.getReader();
const decoder = new TextDecoder();
let buffer = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  buffer += decoder.decode(value, { stream: true });
  const events = buffer.split('\n\n');
  buffer = events.pop() ?? '';

  for (const raw of events) {
    const eventLine = raw.split('\n').find(l => l.startsWith('event: '));
    const dataLine  = raw.split('\n').find(l => l.startsWith('data: '));
    if (!eventLine || !dataLine) continue;

    const event = eventLine.slice(7).trim();
    const data  = JSON.parse(dataLine.slice(6));

    if (event === 'token') appendToMessage(data.token);
    if (event === 'done')  finalizeMessage(data);
    if (event === 'error') showError(data.message);
  }
}
```

---

### Cliente TypeScript incluido

El archivo `src/client/olan-ai-gateway.client.ts` ya tiene el cliente listo para copiar en Olan:

```typescript
import { createOlanAiGatewayClient, resolveUserMessage } from './olan-ai-gateway.client';

const client = createOlanAiGatewayClient();
// Lee OLAN_AI_GATEWAY_URL y OLAN_AI_GATEWAY_KEY del entorno

// Chat normal
const response = await client.chat({
  question: 'Explica la ley de oferta y demanda',
  model: 'llama3.2:3b',
  userId: user.id,
  conversationId: session.conversationId,
});

const text = resolveUserMessage(response);
// → maneja answered / no_context / error automáticamente

// Chat con streaming
const final = await client.streamChat(
  { question, model, userId: user.id },
  (token) => appendTokenToUI(token),
);
```

---

## 2. Traductor

### POST `/api/translate`

Traduce un texto a hasta 3 idiomas en una sola llamada.

```http
POST /api/translate
Content-Type: application/json
x-ai-gateway-key: <key>
```

**Body**

```json
{
  "text": "La ley de garantía protege al consumidor.",
  "languages": ["inglés", "francés", "portugués"]
}
```

| Campo | Tipo | Requerido | Descripción |
|---|---|---|---|
| `text` | string | ✅ | Texto a traducir (máx 3000 chars) |
| `languages` | string[] | ✅ | 1 a 3 idiomas en español o inglés |
| `model` | string | No | Ignorado por compatibilidad; traducción usa `translategemma:4b` |

**Respuesta 200**

```json
{
  "original": "La ley de garantía protege al consumidor.",
  "translations": {
    "inglés":    "The warranty law protects the consumer.",
    "francés":   "La loi de garantie protège le consommateur.",
    "portugués": "A lei de garantia protege o consumidor."
  },
  "model": "translategemma:4b",
  "durationMs": 1540
}
```

**Ejemplo uso en Olan**

```typescript
const res = await fetch(`${GATEWAY_URL}/api/translate`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-ai-gateway-key': GATEWAY_KEY,
  },
  body: JSON.stringify({
    text: selectedText,
    languages: ['inglés'],
  }),
});

const data = await res.json();
const traduccion = data.translations['inglés'];
```

---

## 3. TTS — Texto a Voz

### POST `/api/tts`

Convierte texto a audio WAV. Responde con el binario del archivo directamente.

```http
POST /api/tts
Content-Type: application/json
x-ai-gateway-key: <key>
```

**Body**

```json
{
  "text": "Hola, este es el texto que se va a leer en voz alta.",
  "voice": "ef_dora",
  "speed": 1.0
}
```

| Campo | Tipo | Requerido | Default | Descripción |
|---|---|---|---|---|
| `text` | string | ✅ | — | Texto a sintetizar. Acepta Markdown (se limpia automáticamente) |
| `voice` | string | — | `ef_dora` | Voz Kokoro |
| `speed` | number | — | `1.0` | Velocidad (0.5 – 2.0) |

**Respuesta 200**

- `Content-Type: audio/wav`
- `X-TTS-Cache: hit` (desde caché) o `X-TTS-Cache: miss` (generado)
- Cuerpo: bytes del archivo WAV

> El primer request descarga el modelo Kokoro (~300 MB) y puede tardar 2–5 min.
> Los siguientes requests son instantáneos si el audio está en caché (TTL 30 min).

**Ejemplo en React Native / frontend**

```typescript
async function playResponse(text: string) {
  const res = await fetch(`${GATEWAY_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ai-gateway-key': GATEWAY_KEY,
    },
    body: JSON.stringify({ text }),
  });

  if (!res.ok) throw new Error(`TTS error: ${res.status}`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}
```

---

## 4. Conversaciones (historial por usuario)

### GET `/api/conversations`

Lista las conversaciones activas de un usuario.

```http
GET /api/conversations?userId=<uid>&status=active&limit=50
x-ai-gateway-key: <key>
```

**Respuesta 200**

```json
{
  "items": [
    {
      "id": "uuid",
      "userId": "usuario-123",
      "title": "¿Qué es la fotosíntesis?",
      "status": "active",
      "updatedAt": "2026-05-25T14:30:00.000Z",
      "createdAt": "2026-05-25T14:00:00.000Z"
    }
  ],
  "total": 3
}
```

---

### GET `/api/conversations/:id/messages`

Obtiene los mensajes de una conversación.

```http
GET /api/conversations/<conversationId>/messages?userId=<uid>&limit=200
x-ai-gateway-key: <key>
```

**Respuesta 200**

```json
{
  "conversationId": "uuid",
  "items": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "¿Qué es la fotosíntesis?",
      "createdAt": "2026-05-25T14:00:00.000Z"
    },
    {
      "id": "msg-uuid-2",
      "role": "assistant",
      "content": "La fotosíntesis es...",
      "model": "llama3.2:3b",
      "status": "saved",
      "chunksUsed": 0,
      "createdAt": "2026-05-25T14:00:03.000Z"
    }
  ],
  "total": 2
}
```

---

### PATCH `/api/conversations/:id/title`

Renombra una conversación.

```http
PATCH /api/conversations/<id>/title?userId=<uid>
Content-Type: application/json
x-ai-gateway-key: <key>

{ "title": "Nuevo nombre de la conversación" }
```

---

### DELETE `/api/conversations/:id`

Elimina una conversación y todos sus mensajes del historial caliente en MongoDB y de la fuente persistente.

```http
DELETE /api/conversations/<id>?userId=<uid>
x-ai-gateway-key: <key>
```

**Respuesta 200**

```json
{ "deleted": true, "conversationId": "uuid" }
```

---

## 5. Modelos disponibles

### GET `/api/ollama/models`

```http
GET /api/ollama/models
x-ai-gateway-key: <key>
```

**Respuesta 200**

```json
{
  "models": [
    { "name": "llama3.2:3b", "label": "Llama 3.2 3B", "size": 1900000000, "modifiedAt": "..." }
  ],
  "modelNames": ["llama3.2:3b"]
}
```

---

## 6. Health check

No requiere autenticación.

```http
GET /health
```

```json
{ "status": "ok", "service": "olan-ai-gateway", "timestamp": "2026-05-25T14:00:00.000Z" }
```

---

## Flujo recomendado en Olan

```
Usuario escribe mensaje
       ↓
Olan Backend llama POST /api/chat/stream con { userId, conversationId, question, model }
       ↓
Tokens SSE llegan → se muestran en tiempo real en la UI
       ↓
Evento 'done' → guardar conversationId en sesión del usuario
       ↓
(Opcional) Usuario pulsa botón de voz → POST /api/tts con el texto de la respuesta
       ↓
(Opcional) Usuario pulsa traducir   → POST /api/translate con el texto y los idiomas
```

---

## Códigos de error comunes

| Código | Causa | Solución |
|---|---|---|
| `401` | Header `x-ai-gateway-key` ausente o incorrecto | Verificar la clave en las variables de entorno |
| `400` | Campo requerido faltante o inválido | Revisar el body del request |
| `404` | Conversación no encontrada o eliminada | Crear una nueva sin `conversationId` |
| `429` | Rate limit (30 req/min por IP) | Implementar cola o debounce en el frontend |
| `503` | Ollama no disponible / TTS no disponible | Verificar que los contenedores estén corriendo |
