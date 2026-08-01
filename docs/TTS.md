# OLAN AI Gateway — Integración TTS (Texto a Voz)

Base URL: `https://ai.tudominio.com` · Auth: `x-ai-gateway-key: <clave>`

---

## Endpoints

### `POST /api/tts` — Sintetizar audio

**Body**

```json
{
  "text": "Hola, soy Olán, tu asistente educativa.",
  "voice": "edge:es-MX-DaliaNeural",
  "speed": 1.0
}
```

| Campo   | Tipo   | Default                    | Descripción                          |
|---------|--------|----------------------------|--------------------------------------|
| `text`  | string | —                          | Texto a sintetizar (máx 4000 chars). Acepta Markdown (se limpia automáticamente) |
| `voice` | string | `edge:es-PE-CamilaNeural`  | ID de voz (ver catálogo abajo)       |
| `speed` | number | `1.0`                      | Velocidad (0.5 – 2.0)                |

**Respuesta 200**

- Voces `edge:*` → `Content-Type: audio/mpeg` (MP3)
- Voces Piper → `Content-Type: audio/wav`

Headers útiles:

| Header              | Valor            | Descripción                              |
|---------------------|------------------|------------------------------------------|
| `X-TTS-Cache`       | `hit` / `miss`   | Si vino del caché (TTL 30 min)           |
| `X-TTS-Voice-Used`  | `<voice_id>`     | Voz efectivamente usada                  |
| `X-TTS-Fallback`    | `piper`          | Presente solo si Edge TTS falló y usó Piper como fallback |

> **Nota sobre fallback:** las voces `edge:*` requieren internet. Si el servidor no puede alcanzar Microsoft (común en VPS), el servicio cae automáticamente a la voz Piper equivalente del mismo idioma sin retornar error.

---

### `GET /api/tts/voices` — Catálogo de voces

```http
GET /api/tts/voices
x-ai-gateway-key: <clave>
```

**Respuesta 200**

```json
{
  "voices": {
    "es": [
      { "id": "edge:es-MX-DaliaNeural", "name": "Dalia ☁️ MX", "gender": "female", "provider": "edge" },
      { "id": "es_MX-ines-medium",      "name": "Inés 🖥️ MX",  "gender": "female", "provider": "piper" }
    ],
    "en": [ "..." ],
    "fr": [ "..." ]
  }
}
```

- `☁️` = Edge TTS (online, Microsoft Neural, alta calidad)
- `🖥️` = Piper TTS (local, sin internet, descarga el modelo al primer uso)

---

## Voces disponibles en español (latinoamericanas)

| ID                          | Nombre     | País      | Proveedor |
|-----------------------------|------------|-----------|-----------|
| `edge:es-MX-DaliaNeural`   | Dalia      | México    | Edge ☁️   |
| `edge:es-CO-SalomeNeural`  | Salomé     | Colombia  | Edge ☁️   |
| `edge:es-AR-ElenaNeural`   | Elena      | Argentina | Edge ☁️   |
| `edge:es-CL-CatalinaNeural`| Catalina   | Chile     | Edge ☁️   |
| `edge:es-VE-PaolaNeural`   | Paola      | Venezuela | Edge ☁️   |
| `edge:es-PE-CamilaNeural`  | Camila     | Perú      | Edge ☁️   |
| `es_MX-ines-medium`        | Inés       | México    | Piper 🖥️  |
| `es_MX-ald-medium`         | Ald        | México    | Piper 🖥️  |

---

## Ejemplo de integración

```typescript
async function playTts(text: string, voice = 'edge:es-PE-CamilaNeural') {
  const res = await fetch(`${GATEWAY_URL}/api/tts`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ai-gateway-key': GATEWAY_KEY,
    },
    body: JSON.stringify({ text, voice }),
  });

  if (!res.ok) throw new Error(`TTS error: ${res.status}`);

  const blob = await res.blob();
  const url  = URL.createObjectURL(blob);
  const audio = new Audio(url);

  audio.onended = () => URL.revokeObjectURL(url);
  await audio.play();
}
```

**React Native**

```typescript
import Sound from 'react-native-sound';
import RNFS from 'react-native-fs';

async function playTtsNative(text: string) {
  const res = await fetch(`${GATEWAY_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-ai-gateway-key': GATEWAY_KEY },
    body: JSON.stringify({ text, voice: 'edge:es-PE-CamilaNeural' }),
  });

  const blob  = await res.blob();
  const path  = `${RNFS.CachesDirectoryPath}/tts_${Date.now()}.mp3`;
  // escribir blob a archivo y reproducir con Sound...
}
```

---

## Flujo recomendado

```
IA responde texto
      ↓
POST /api/tts  { text: respuesta, voice: "edge:es-PE-CamilaNeural" }
      ↓
¿Cache hit?  → devuelve audio inmediato (< 50 ms)
¿Cache miss? → genera audio (Edge: ~1-2s · Piper: ~3-5s en CPU)
      ↓
Reproducir blob en el frontend
```

---

## Caché

- TTL: **30 minutos** por combinación `(texto + voz + velocidad)`
- Almacenamiento: MongoDB (marca TTL) + disco (archivo de audio)
- El mismo texto con la misma voz siempre devuelve el audio cacheado sin regenerar

---

## Errores comunes

| Código | Causa                                    | Solución                                      |
|--------|------------------------------------------|-----------------------------------------------|
| `400`  | Texto vacío o mayor a 4000 chars         | Truncar el texto antes de enviarlo            |
| `401`  | API key ausente o incorrecta             | Verificar header `x-ai-gateway-key`           |
| `500`  | Edge TTS bloqueado sin fallback Piper    | El servicio usa fallback automático; revisar logs |
| `503`  | Contenedor TTS no disponible             | `docker compose restart tts-service`          |
