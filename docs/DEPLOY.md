# ACOREAI AI Gateway — Despliegue y Actualización en VPS

> Guía para montar desde cero o actualizar un servidor ya existente con Docker.

---

## Requisitos del servidor

| Recurso | Mínimo | Recomendado |
|---|---|---|
| OS | Ubuntu 22.04 / Debian 12 | Ubuntu 22.04 LTS |
| RAM | 6 GB | 10 GB |
| CPU | 4 cores | 6+ cores |
| Disco | 20 GB | 40 GB (modelos + caché) |
| Software | Docker 24+, Docker Compose v2 | + Nginx, Certbot |

---

## Servicios que levanta Docker

| Contenedor | Puerto interno | Descripción |
|---|---|---|
| `acoreai-gateway` | `127.0.0.1:4005` | API principal NestJS |
| `acoreai-ollama` | `127.0.0.1:11434` | Modelos de lenguaje (no expuesto) |
| `acoreai-ai-postgres` | `127.0.0.1:5438` | Base de datos PostgreSQL + pgvector |
| `acoreai-ai-mongodb` | `127.0.0.1:27018` | Historial de conversaciones y caché TTS |
| `acoreai-tts` | `127.0.0.1:8880` | Servicio de texto a voz (Kokoro) |
| `acoreai-stt` | `127.0.0.1:9000` | Servicio de voz a texto (Whisper medium) |
| `acoreai-web` | `127.0.0.1:5175` | Web ACoreAI, con proxy interno al gateway |

---

## INSTALACIÓN DESDE CERO

### 1. Instalar Docker en el VPS

```bash
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Verificar
docker --version
docker compose version
```

### 2. Subir el código al VPS

**Opción A — Git (recomendado)**
```bash
git clone https://github.com/tu-org/acoreai-gateway.git ~/acoreai-gateway
cd ~/acoreai-gateway
```

**Opción B — SCP desde tu máquina local**
```bash
scp -r /ruta/local/acoreai-gateway usuario@IP_VPS:~/acoreai-gateway
ssh usuario@IP_VPS
cd ~/acoreai-gateway
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env   # o crea el archivo manualmente
nano .env
```

Archivo `.env` mínimo para producción:

```env
# ── Gateway ──────────────────────────────────────────────
PORT=4005
NODE_ENV=production
LOG_LEVEL=info

AI_GATEWAY_KEY=generar_con_openssl_rand_hex_32
JWT_SECRET=generar_con_openssl_rand_hex_32
JWT_ISSUER=acoreai-gateway
JWT_AUDIENCE=acoreai-app
JWT_ACCESS_TTL_SECONDS=900
JWT_REFRESH_TTL_SECONDS=2592000

# ── Ollama ────────────────────────────────────────────────
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
EMBEDDING_DIMENSIONS=768
OLLAMA_NUM_THREAD=8
# Docker: hasta 11 GiB de RAM + 4 GiB de swap para Ollama.
OLLAMA_MEM_LIMIT=11g
OLLAMA_MEMSWAP_LIMIT=15g

# ── Base de datos ─────────────────────────────────────────
POSTGRES_USER=acoreai_admin_ai
POSTGRES_PASSWORD=generar_con_openssl_rand_base64_32
POSTGRES_DB=acoreai_ai
DATABASE_URL=postgresql://acoreai_admin_ai:misma_password_de_postgres_url_encoded@postgres:5438/acoreai_ai

# ── MongoDB ────────────────────────────────────────────────
MONGODB_URI=mongodb://mongodb:27017/acoreai_ai_gateway
MONGODB_DB=acoreai_ai_gateway
MONGODB_MAX_POOL_SIZE=20

# ── TTS ───────────────────────────────────────────────────
TTS_SERVICE_URL=http://tts-service:8880
STT_SERVICE_URL=http://stt-service:9000

# ── CORS (dominios del frontend ACoreAI) ─────────────────────
CORS_ORIGINS=https://app.acoreai.com,https://www.acoreai.com

# ── Admin inicial ─────────────────────────────────────────
ADMIN_EMAIL=admin@tudominio.com
ADMIN_PASSWORD=generar_con_openssl_rand_base64_24
ADMIN_NAME=Administrador ACOREAI
```

Genera secretos nuevos en el VPS:

```bash
openssl rand -hex 32      # AI_GATEWAY_KEY y JWT_SECRET
openssl rand -base64 32   # POSTGRES_PASSWORD
openssl rand -base64 24   # ADMIN_PASSWORD
```

> ⚠️ **Nunca** subas el `.env` a Git. Verifica que esté en `.gitignore`. Si una clave real se compartió por chat, ticket, ZIP, backup o repo, considérala comprometida y rótala.

### 4. Levantar todos los contenedores

```bash
cd ~/acoreai-gateway
# Ejecutar una vez en el VPS; requiere sudo y deja 4 GiB de swap persistente.
sudo ./scripts/ensure-ollama-swap.sh
docker compose up -d --build
```

Esto construye las imágenes y levanta los 5 servicios. La primera vez tarda varios minutos (compilación TypeScript + descarga de imágenes base).

Verificar que todos están corriendo:

```bash
docker compose ps
```

Esperar que todos muestren `healthy`:

```
NAME                STATUS
acoreai-gateway     Up X min (healthy)
acoreai-ai-postgres    Up X min (healthy)
acoreai-ai-mongodb     Up X min (healthy)
acoreai-ollama         Up X min (healthy)
acoreai-tts            Up X min (healthy)
acoreai-stt            Up X min (healthy)
```

> `acoreai-stt` tarda ~3-5 min en el primer arranque descargando el modelo Whisper medium (~1.5 GB).
> Los siguientes arranques son inmediatos gracias al volumen `acoreai_stt_cache`.

### 5. Descargar modelos de Ollama

```bash
# Modelo de chat (el que usarás en las peticiones)
docker compose exec ollama ollama pull llama3.2:3b

# Modelo de traducción
docker compose exec ollama ollama pull translategemma:4b

# Modelo de embeddings (para RAG)
docker compose exec ollama ollama pull nomic-embed-text

# Verificar modelos descargados
docker compose exec ollama ollama list
```

> Los modelos se guardan en el volumen `ollama_data` y **persisten entre reinicios**.  
> `llama3.2:3b` pesa ~2 GB. `translategemma:4b` se usa exclusivamente para traducción. Usar `qwen3:4b` si se quiere más calidad en chat (~2.4 GB).

Ollama tiene por defecto un máximo de 11 GiB de RAM y 15 GiB de memoria total
(RAM + hasta 4 GiB de swap). El script de swap es seguro de repetir: si el VPS
ya tiene 4 GiB o más de swap activa, no crea otra.

### 6. Verificar que funciona

```bash
# Health check del gateway
curl http://127.0.0.1:4005/health/ready

# Métricas Prometheus
curl http://127.0.0.1:4005/metrics

# Web ACoreAI
curl http://127.0.0.1:5175/

# Chat de prueba
curl -X POST http://127.0.0.1:4005/api/chat \
  -H "Content-Type: application/json" \
  -H "x-ai-gateway-key: TU_CLAVE" \
  -d '{"question":"Hola","model":"llama3.2:3b","useRag":false}'

# Demo visual
# Abrir en navegador: http://IP_VPS:4005/demo
```

### 7. Configurar Nginx para el gateway (acceso público con HTTPS)

El dominio `ai.217-77-0-2.nip.io` debe resolver a la IP pública del VPS (nip.io
lo hace automáticamente). Abre los puertos TCP 80 y 443 en el firewall o panel
del proveedor. El gateway queda publicado solo por Nginx; no expongas el
puerto 4005 directamente a Internet.

```bash
apt install nginx certbot python3-certbot-nginx -y

cp ~/acoreai-gateway/docker/nginx/acoreai-gateway.conf \
   /etc/nginx/sites-available/acoreai-gateway.conf

ln -s /etc/nginx/sites-available/acoreai-gateway.conf \
      /etc/nginx/sites-enabled/acoreai-gateway.conf

# Si está habilitado el sitio por defecto, desactívalo para evitar que capture
# las peticiones a este dominio.
rm -f /etc/nginx/sites-enabled/default

nginx -t && systemctl reload nginx

# Certificado SSL gratuito
certbot --nginx -d ai.217-77-0-2.nip.io --redirect

# Comprobaciones
curl -I http://ai.217-77-0-2.nip.io
curl -I https://ai.217-77-0-2.nip.io/health/ready
certbot renew --dry-run
```

Nginx termina TLS y envía todo a `127.0.0.1:4005`, incluyendo las rutas SSE sin
buffering. Por eso no debes hacer proxy público directo al puerto 4005.

ACoreAI Web también corre un Nginx interno. El navegador no recibe `AI_GATEWAY_KEY`; el contenedor `acoreai-web` la usa solo server-side para proxyear `/api` hacia `acoreai-gateway`.

---

## ACTUALIZAR UN SERVIDOR YA EXISTENTE

Este es el flujo para cuando hay código nuevo y el servidor ya está corriendo.

### Paso 1 — Subir el código nuevo

**Si usas Git:**
```bash
cd ~/acoreai-gateway
git pull origin main
```

**Si subes con SCP desde local:**
```bash
# Ejecutar desde tu máquina local
scp -r /ruta/local/acoreai-gateway usuario@IP_VPS:~/acoreai-gateway
```

### Paso 2 — Reconstruir y reiniciar gateway y servicios de voz

Para cambios en rutas, modelos, TTS o STT reconstruye gateway y servicios de voz:

```bash
cd ~/acoreai-gateway
docker compose up -d --build acoreai-gateway stt-service tts-service
```

Verificar que levantó bien:
```bash
docker compose ps acoreai-gateway
docker compose logs --tail=30 acoreai-gateway
```

Validar que STT quedo montado:
```bash
printf '' > /tmp/empty-audio.webm
curl -X POST 'http://127.0.0.1:4005/api/stt?language=es' \
  -H "x-ai-gateway-key: tu_clave" \
  -F "audio=@/tmp/empty-audio.webm;type=audio/webm"
```

Esa prueba debe responder un error de archivo vacio desde STT. Si responde `404 Cannot POST /api/stt`, el VPS sigue corriendo una version vieja del gateway.

### Paso 3 — Si también cambió el TTS service

```bash
docker compose build tts-service
docker compose up -d tts-service
```

### Paso 4 — Si cambiaron TODOS los servicios

```bash
docker compose build
docker compose up -d
```

---

## REINICIO LIMPIO (sin perder datos)

Reinicia los contenedores sin borrar volúmenes (BD, modelos, caché):

```bash
cd ~/acoreai-gateway
docker compose down
docker compose up -d
```

---

## RESET TOTAL (borra todos los datos)

> ⚠️ Esto elimina la base de datos, historial de conversaciones, modelos descargados y caché de TTS.  
> Úsalo solo si quieres empezar desde cero.

```bash
cd ~/acoreai-gateway
docker compose down -v   # -v elimina los volúmenes
docker compose up -d --build
```

Después del reset hay que volver a descargar los modelos:
```bash
docker compose exec ollama ollama pull llama3.2:3b
docker compose exec ollama ollama pull nomic-embed-text
```

---

## COMANDOS DE OPERACIÓN DIARIA

### Ver estado de todos los servicios
```bash
docker compose ps
```

### Ver logs en tiempo real
```bash
# Todos los servicios
docker compose logs -f

# Solo el gateway
docker compose logs -f acoreai-gateway

# Solo el TTS
docker compose logs -f tts-service

# Últimas 50 líneas del gateway
docker compose logs --tail=50 acoreai-gateway
```

### Reiniciar un servicio sin reconstruir
```bash
docker compose restart acoreai-gateway
docker compose restart tts-service
docker compose restart mongodb
```

### Ver uso de recursos
```bash
docker stats --no-stream
```

### Entrar a un contenedor
```bash
# Gateway
docker compose exec acoreai-gateway sh

# MongoDB (ver colecciones)
docker compose exec mongodb mongosh
# Dentro de mongosh:
#   use acoreai_ai_gateway
#   db.conversations.find().limit(5)
#   db.conversation_messages.find().limit(5)

# PostgreSQL
docker compose exec postgres psql -U acoreai_admin_ai -d acoreai_ai -p 5438
```

---

## ACTUALIZACIÓN RÁPIDA — RESUMEN

```bash
# 1. Ir al directorio del proyecto en el VPS
cd ~/acoreai-gateway

# 2. Bajar cambios (si usas git)
git pull origin main

# 3. Reconstruir y reiniciar solo el gateway
docker compose build acoreai-gateway && docker compose up -d acoreai-gateway

# 4. Verificar
docker compose ps
curl http://127.0.0.1:4005/health/ready
```

---

## SOLUCIÓN DE PROBLEMAS

### El gateway no levanta (`unhealthy` o `restarting`)

```bash
docker compose logs acoreai-gateway
```

Causas comunes:
- `.env` mal configurado (variable faltante o inválida)
- PostgreSQL o MongoDB no disponibles aún (esperar 30 s y reintentar)
- Puerto 4005 ocupado por otro proceso

### Ollama responde muy lento

- Normal en CPU sin GPU. `llama3.2:3b` tarda ~10-20 s por respuesta en 4 cores.
- Aumentar `OLLAMA_NUM_THREAD` en `.env` al número de cores disponibles.
- Verificar que no hay otro proceso consumiendo CPU: `htop`

### TTS muy lento la primera vez

El servicio descarga el modelo Kokoro (~300 MB) en el primer request. Los siguientes son rápidos gracias al caché en MongoDB (TTL 30 min) y disco. El modelo queda guardado en el volumen `acoreai_tts_cache`.

### MongoDB perdió el historial de conversaciones

MongoDB persiste datos en `acoreai_ai_mongodb_data`. Si el volumen existe, el historial caliente sobrevive reinicios. Si se hizo `docker compose down -v`, los datos calientes se pierden; PostgreSQL conserva la fuente de verdad de conversaciones.

### Error `prisma migrate deploy` al iniciar

```bash
# Ver el error exacto
docker compose logs acoreai-gateway | grep -i "migrate\|prisma\|error"

# Correr la migración manualmente
docker compose exec acoreai-gateway pnpm exec prisma migrate deploy
```

### Limpiar imágenes y capas antiguas (liberar espacio)

```bash
docker system prune -f
docker image prune -f
```

---

## ARQUITECTURA EN EL VPS

```
Internet (HTTPS :443)
        │
        ▼
     Nginx
        │  proxy_pass
        ▼
acoreai-gateway :4005  (solo 127.0.0.1)
   │        │        │         │
   ▼        ▼        ▼         ▼
MongoDB  Postgres  Ollama   TTS service
:27017   :5438    :11434     :8880
(conv.   (datos   (modelos  (Kokoro
historial) app)   LLM)      audio)
```

Ningún servicio interno queda expuesto a internet directamente. Solo Nginx habla con el gateway.
