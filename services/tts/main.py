import asyncio
import base64
import hashlib
import logging
import os
import re
import subprocess
import tempfile
import time
import urllib.request
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone

import edge_tts
from fastapi import FastAPI, HTTPException
from fastapi.responses import Response
from pymongo import MongoClient
from pydantic import BaseModel

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODELS_DIR  = os.getenv("PIPER_MODELS_DIR", "/home/app/.cache/piper")
CACHE_DIR   = os.getenv("TTS_CACHE_DIR", "/app/tts_cache")
CACHE_TTL   = 1800
PIPER_BIN   = "/opt/piper/piper"
ESPEAK_DATA = "/opt/piper/espeak-ng-data"
MONGODB_URI = os.getenv("MONGODB_URI", "mongodb://mongodb:27017/acoreai_ai_gateway")
MONGODB_DB  = os.getenv("MONGODB_DB", "acoreai_ai_gateway")
HF_BASE     = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"

os.makedirs(MODELS_DIR, exist_ok=True)
os.makedirs(CACHE_DIR,  exist_ok=True)

# ── Catálogo de voces ─────────────────────────────────────────────────────────
# Prefijo "edge:" → Edge TTS (online, Microsoft Neural)
# Sin prefijo     → Piper TTS (local, requiere descarga del modelo)

VOICES_CATALOG: dict[str, list[dict]] = {
    "es": [
        # ── Edge TTS · Latinoamérica (online) ──
        {"id": "edge:es-MX-DaliaNeural",    "name": "Dalia ☁️ MX",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-CO-SalomeNeural",   "name": "Salomé ☁️ CO",     "gender": "female", "provider": "edge"},
        {"id": "edge:es-AR-ElenaNeural",    "name": "Elena ☁️ AR",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-CL-CatalinaNeural", "name": "Catalina ☁️ CL",   "gender": "female", "provider": "edge"},
        {"id": "edge:es-VE-PaolaNeural",    "name": "Paola ☁️ VE",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-PE-CamilaNeural",   "name": "Camila ☁️ PE",     "gender": "female", "provider": "edge"},
        {"id": "edge:es-MX-JorgeNeural",    "name": "Jorge ☁️ MX",      "gender": "male",   "provider": "edge"},
        {"id": "edge:es-CO-GonzaloNeural",  "name": "Gonzalo ☁️ CO",    "gender": "male",   "provider": "edge"},
        # ── Piper · México (local) ──
        {"id": "es_MX-ines-medium",         "name": "Inés 🖥️ MX",       "gender": "female", "provider": "piper", "url_path": "es/es_MX/ines/medium"},
        {"id": "es_MX-ines-low",            "name": "Inés low 🖥️ MX",   "gender": "female", "provider": "piper", "url_path": "es/es_MX/ines/low"},
        {"id": "es_MX-ald-medium",          "name": "Ald 🖥️ MX",        "gender": "male",   "provider": "piper", "url_path": "es/es_MX/ald/medium"},
        {"id": "es_MX-claude-high",         "name": "Claude HD 🖥️ MX",  "gender": "male",   "provider": "piper", "url_path": "es/es_MX/claude/high"},
    ],
    "en": [
        {"id": "en_US-lessac-medium",       "name": "Lessac 🖥️",        "gender": "female", "provider": "piper", "url_path": "en/en_US/lessac/medium"},
        {"id": "en_US-ryan-medium",         "name": "Ryan 🖥️",          "gender": "male",   "provider": "piper", "url_path": "en/en_US/ryan/medium"},
        {"id": "en_US-amy-medium",          "name": "Amy 🖥️",           "gender": "female", "provider": "piper", "url_path": "en/en_US/amy/medium"},
        {"id": "en_GB-alan-medium",         "name": "Alan GB 🖥️",       "gender": "male",   "provider": "piper", "url_path": "en/en_GB/alan/medium"},
        {"id": "edge:en-US-JennyNeural",    "name": "Jenny ☁️",         "gender": "female", "provider": "edge"},
        {"id": "edge:en-US-GuyNeural",      "name": "Guy ☁️",           "gender": "male",   "provider": "edge"},
    ],
    "fr": [
        {"id": "fr_FR-siwis-medium",        "name": "Siwis 🖥️",         "gender": "female", "provider": "piper", "url_path": "fr/fr_FR/siwis/medium"},
        {"id": "fr_FR-gilles-low",          "name": "Gilles 🖥️",        "gender": "male",   "provider": "piper", "url_path": "fr/fr_FR/gilles/low"},
        {"id": "edge:fr-FR-DeniseNeural",   "name": "Denise ☁️",        "gender": "female", "provider": "edge"},
    ],
    "de": [
        {"id": "de_DE-thorsten-medium",     "name": "Thorsten 🖥️",      "gender": "male",   "provider": "piper", "url_path": "de/de_DE/thorsten/medium"},
        {"id": "de_DE-eva_k-x_low",         "name": "Eva 🖥️",           "gender": "female", "provider": "piper", "url_path": "de/de_DE/eva_k/x_low"},
        {"id": "edge:de-DE-KatjaNeural",    "name": "Katja ☁️",         "gender": "female", "provider": "edge"},
    ],
    "pt": [
        {"id": "pt_BR-faber-medium",        "name": "Faber 🖥️ BR",      "gender": "male",   "provider": "piper", "url_path": "pt/pt_BR/faber/medium"},
        {"id": "edge:pt-BR-FranciscaNeural","name": "Francisca ☁️ BR",  "gender": "female", "provider": "edge"},
    ],
    "zh": [
        {"id": "zh_CN-huayan-medium",       "name": "Huayan 🖥️",        "gender": "female", "provider": "piper", "url_path": "zh/zh_CN/huayan/medium"},
        {"id": "edge:zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao ☁️",      "gender": "female", "provider": "edge"},
    ],
    "it": [
        {"id": "it_IT-riccardo-x_low",      "name": "Riccardo 🖥️",      "gender": "male",   "provider": "piper", "url_path": "it/it_IT/riccardo/x_low"},
        {"id": "edge:it-IT-ElsaNeural",     "name": "Elsa ☁️",          "gender": "female", "provider": "edge"},
    ],
    "ja": [
        {"id": "ja_JP-kokoro-medium",       "name": "Kokoro 🖥️",        "gender": "female", "provider": "piper", "url_path": "ja/ja_JP/kokoro/medium"},
        {"id": "edge:ja-JP-NanamiNeural",   "name": "Nanami ☁️",        "gender": "female", "provider": "edge"},
    ],
    "ko": [
        {"id": "ko_KR-kss-high",            "name": "Kss 🖥️",           "gender": "female", "provider": "piper", "url_path": "ko/ko_KR/kss/high"},
        {"id": "edge:ko-KR-SunHiNeural",    "name": "SunHi ☁️",         "gender": "female", "provider": "edge"},
    ],
    "ru": [
        {"id": "ru_RU-ruslan-medium",       "name": "Ruslan 🖥️",        "gender": "male",   "provider": "piper", "url_path": "ru/ru_RU/ruslan/medium"},
        {"id": "edge:ru-RU-SvetlanaNeural", "name": "Svetlana ☁️",      "gender": "female", "provider": "edge"},
    ],
    "hi": [
        {"id": "hi_IN-sangita-medium",      "name": "Sangita 🖥️",       "gender": "female", "provider": "piper", "url_path": "hi/hi_IN/sangita/medium"},
        {"id": "edge:hi-IN-SwaraNeural",    "name": "Swara ☁️",         "gender": "female", "provider": "edge"},
    ],
}

DEFAULT_VOICE = "edge:es-PE-CamilaNeural"

_VOICE_MAP: dict[str, dict] = {
    v["id"]: {**v, "lang": lang}
    for lang, voices in VOICES_CATALOG.items()
    for v in voices
}

_mongo: MongoClient | None = None
_tts_cache = None


# ── Helpers de proveedor ──────────────────────────────────────────────────────

def _is_edge(voice_id: str) -> bool:
    return voice_id.startswith("edge:")

def _ext(voice_id: str) -> str:
    return "mp3" if _is_edge(voice_id) else "wav"

def _content_type(voice_id: str) -> str:
    return "audio/mpeg" if _is_edge(voice_id) else "audio/wav"


# ── Piper: descarga y síntesis ────────────────────────────────────────────────

def _model_paths(voice_id: str) -> tuple[str, str]:
    onnx = os.path.join(MODELS_DIR, f"{voice_id}.onnx")
    return onnx, onnx + ".json"


def _ensure_model(voice_id: str) -> str:
    info = _VOICE_MAP.get(voice_id)
    if not info or not info.get("url_path"):
        raise ValueError(f"Voz Piper desconocida: {voice_id}")

    onnx_path, cfg_path = _model_paths(voice_id)
    base_url = f"{HF_BASE}/{info['url_path']}/{voice_id}"

    for dest, url in [(onnx_path, f"{base_url}.onnx"), (cfg_path, f"{base_url}.onnx.json")]:
        if os.path.exists(dest):
            continue
        logger.info("Descargando %s …", url)
        tmp = dest + ".tmp"
        try:
            urllib.request.urlretrieve(url, tmp)
            os.replace(tmp, dest)
        except Exception as exc:
            if os.path.exists(tmp):
                os.remove(tmp)
            raise RuntimeError(f"Error descargando {url}: {exc}") from exc

    return onnx_path


def _synthesize_piper(voice_id: str, text: str, speed: float) -> bytes:
    onnx_path     = _ensure_model(voice_id)
    length_scale  = str(round(1.0 / max(speed, 0.1), 4))

    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir="/tmp") as tmp:
        tmp_path = tmp.name
    try:
        result = subprocess.run(
            [PIPER_BIN, "--model", onnx_path, "--output_file", tmp_path,
             "--length_scale", length_scale, "--espeak_data", ESPEAK_DATA],
            input=text.encode("utf-8"),
            capture_output=True,
            timeout=120,
        )
        if result.returncode != 0:
            raise RuntimeError(f"piper error: {result.stderr.decode(errors='replace')}")
        with open(tmp_path, "rb") as f:
            return f.read()
    finally:
        if os.path.exists(tmp_path):
            os.unlink(tmp_path)


# ── Edge TTS: síntesis online ─────────────────────────────────────────────────

async def _synthesize_edge(voice_name: str, text: str, speed: float) -> bytes:
    rate_pct = int((speed - 1.0) * 100)
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str)
    chunks: list[bytes] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
    if not chunks:
        raise RuntimeError("Edge TTS no devolvió audio")
    return b"".join(chunks)


async def _synthesize_edge_with_boundaries(voice_name: str, text: str, speed: float) -> tuple[bytes, list[dict]]:
    """Igual que _synthesize_edge, pero además captura los eventos WordBoundary
    que emite Edge TTS durante el streaming, para poder resaltar palabra por
    palabra en el cliente mientras se reproduce el audio."""
    rate_pct = int((speed - 1.0) * 100)
    rate_str = f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"
    # edge-tts >= 7.x por defecto solo emite SentenceBoundary; hay que pedir
    # WordBoundary explícitamente para poder resaltar palabra por palabra.
    communicate = edge_tts.Communicate(text, voice_name, rate=rate_str, boundary="WordBoundary")
    chunks: list[bytes] = []
    boundaries: list[dict] = []
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            chunks.append(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            # offset/duration vienen en unidades de 100ns (ticks) → ms
            boundaries.append({
                "offsetMs": chunk["offset"] / 10_000,
                "durationMs": chunk["duration"] / 10_000,
                "text": chunk["text"],
            })
    if not chunks:
        raise RuntimeError("Edge TTS no devolvió audio")
    return b"".join(chunks), boundaries


def _piper_fallback_for(voice_id: str) -> str | None:
    """Devuelve el primer voice_id de Piper del mismo idioma, o None."""
    info = _VOICE_MAP.get(voice_id)
    if not info:
        return None
    for v in VOICES_CATALOG.get(info["lang"], []):
        if v.get("provider") == "piper":
            return v["id"]
    return None


_EDGE_BLOCKED = False   # una vez confirmado el bloqueo, evitar reintentos


# ── Cache helpers ─────────────────────────────────────────────────────────────

def _cache_key(text: str, voice: str, speed: float) -> str:
    return hashlib.sha256(f"{text}|{voice}|{speed:.2f}".encode()).hexdigest()

def _audio_path(key: str, voice_id: str) -> str:
    return os.path.join(CACHE_DIR, f"{key}.{_ext(voice_id)}")

def _expires_at() -> datetime:
    return datetime.now(timezone.utc) + timedelta(seconds=CACHE_TTL)


# ── Cleanup ───────────────────────────────────────────────────────────────────

async def _cleanup_loop():
    while True:
        await asyncio.sleep(300)
        try:
            now = time.time()
            for filename in os.listdir(CACHE_DIR):
                if not (filename.endswith(".wav") or filename.endswith(".mp3")):
                    continue
                fpath = os.path.join(CACHE_DIR, filename)
                if now - os.path.getmtime(fpath) > CACHE_TTL:
                    os.remove(fpath)
                    stem = filename.rsplit(".", 1)[0]
                    if _tts_cache is not None:
                        _tts_cache.delete_one({"key": stem})
        except Exception as exc:
            logger.warning("Cleanup error: %s", exc)


# ── App lifespan ──────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _mongo, _tts_cache
    try:
        _mongo = MongoClient(MONGODB_URI, serverSelectionTimeoutMS=5000)
        _mongo.admin.command("ping")
        _tts_cache = _mongo[MONGODB_DB]["tts_cache"]
        _tts_cache.create_index("key", unique=True)
        _tts_cache.create_index("expiresAt", expireAfterSeconds=0)
        logger.info("MongoDB conectado: %s / %s", MONGODB_URI, MONGODB_DB)
    except Exception as exc:
        logger.warning("MongoDB no disponible: %s", exc)
        _mongo = None
        _tts_cache = None
    task = asyncio.create_task(_cleanup_loop())
    yield
    task.cancel()
    if _mongo:
        _mongo.close()


app = FastAPI(lifespan=lifespan)


# ── Markdown stripper ─────────────────────────────────────────────────────────

def _strip_markdown(text: str) -> str:
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"`[^`]+`", "", text)
    text = re.sub(r"#{1,6}\s+", "", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\*(.+?)\*",     r"\1", text, flags=re.DOTALL)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"^\s*[-*+]\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"^\s*\d+\.\s+", "", text, flags=re.MULTILINE)
    text = re.sub(r"\|[^\n]+\|", "", text)
    text = re.sub(r"-{2,}", "", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


# ── Endpoints ─────────────────────────────────────────────────────────────────

class TTSRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    speed: float = 1.0


@app.get("/health")
async def health():
    piper_ok = os.path.isfile(PIPER_BIN) and os.access(PIPER_BIN, os.X_OK)
    return {
        "status": "ok",
        "piper_binary": piper_ok,
        "piper_models_cached": [f[:-5] for f in os.listdir(MODELS_DIR) if f.endswith(".onnx")],
        "edge_tts": "available",
    }


@app.get("/voices")
async def list_voices():
    return {"voices": VOICES_CATALOG}


@app.post("/tts")
async def synthesize(req: TTSRequest):
    text = _strip_markdown(req.text.strip())
    if not text:
        raise HTTPException(status_code=400, detail="Texto vacío tras limpiar markdown")

    voice_id = req.voice if req.voice in _VOICE_MAP else DEFAULT_VOICE
    text = text[:4000]

    key   = _cache_key(text, voice_id, req.speed)
    fpath = _audio_path(key, voice_id)
    ct    = _content_type(voice_id)

    # ── Cache hit ──────────────────────────────────────────────────────────────
    if _tts_cache is not None:
        try:
            cached = _tts_cache.find_one({"key": key, "expiresAt": {"$gt": datetime.now(timezone.utc)}})
            if cached and os.path.exists(fpath):
                logger.info("TTS cache hit %s… voz=%s", key[:8], voice_id)
                with open(fpath, "rb") as f:
                    return Response(content=f.read(), media_type=ct,
                                    headers={"X-TTS-Cache": "hit"})
            _tts_cache.delete_one({"key": key})
        except Exception as exc:
            logger.warning("MongoDB cache error: %s", exc)

    # ── Generación ─────────────────────────────────────────────────────────────
    global _EDGE_BLOCKED
    logger.info("TTS generando %s… voz=%s", key[:8], voice_id)
    try:
        actual_voice_id = voice_id
        if _is_edge(voice_id) and not _EDGE_BLOCKED:
            try:
                edge_voice  = voice_id[5:]
                audio_bytes = await _synthesize_edge(edge_voice, text, req.speed)
                ct          = "audio/mpeg"
                fpath       = _audio_path(key, voice_id)
            except Exception as edge_exc:
                err_str = str(edge_exc)
                if "403" in err_str or "Invalid response" in err_str or "wss://" in err_str:
                    _EDGE_BLOCKED = True
                    fallback = _piper_fallback_for(voice_id)
                    if fallback:
                        logger.warning("Edge TTS bloqueado (403) → fallback Piper: %s", fallback)
                        actual_voice_id = fallback
                        loop        = asyncio.get_event_loop()
                        audio_bytes = await loop.run_in_executor(None, _synthesize_piper, fallback, text, req.speed)
                        ct          = "audio/wav"
                        fpath       = _audio_path(key, fallback)
                    else:
                        raise RuntimeError(f"Edge TTS bloqueado y sin fallback Piper: {edge_exc}") from edge_exc
                else:
                    raise
        elif _is_edge(voice_id) and _EDGE_BLOCKED:
            fallback = _piper_fallback_for(voice_id)
            if not fallback:
                raise RuntimeError("Edge TTS bloqueado (VPS) y sin voz Piper de respaldo")
            logger.info("Edge TTS bloqueado, usando Piper: %s", fallback)
            actual_voice_id = fallback
            loop        = asyncio.get_event_loop()
            audio_bytes = await loop.run_in_executor(None, _synthesize_piper, fallback, text, req.speed)
            ct          = "audio/wav"
            fpath       = _audio_path(key, fallback)
        else:
            loop        = asyncio.get_event_loop()
            audio_bytes = await loop.run_in_executor(None, _synthesize_piper, voice_id, text, req.speed)

        with open(fpath, "wb") as f:
            f.write(audio_bytes)

        if _tts_cache is not None:
            try:
                _tts_cache.update_one(
                    {"key": key},
                    {
                        "$set": {
                            "key": key,
                            "voice": actual_voice_id,
                            "path": fpath,
                            "updatedAt": datetime.now(timezone.utc),
                            "expiresAt": _expires_at(),
                        },
                        "$setOnInsert": {"createdAt": datetime.now(timezone.utc)},
                    },
                    upsert=True,
                )
            except Exception as exc:
                logger.warning("MongoDB set error: %s", exc)

        headers = {"X-TTS-Cache": "miss", "X-TTS-Voice-Used": actual_voice_id}
        if actual_voice_id != voice_id:
            headers["X-TTS-Fallback"] = "piper"
        return Response(content=audio_bytes, media_type=ct, headers=headers)

    except Exception as exc:
        logger.error("Error TTS: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error generando audio: {exc}") from exc


class AlignedTTSResponse(BaseModel):
    audioBase64: str
    contentType: str
    text: str
    boundaries: list[dict]


@app.post("/tts/aligned", response_model=AlignedTTSResponse)
async def synthesize_aligned(req: TTSRequest):
    """Como /tts, pero además devuelve el timing por palabra (WordBoundary)
    para que el cliente pueda resaltar la lectura en sincronía con el audio.
    Solo Edge TTS emite esos eventos; con voces Piper se devuelve boundaries=[]."""
    text = _strip_markdown(req.text.strip())
    if not text:
        raise HTTPException(status_code=400, detail="Texto vacío tras limpiar markdown")

    voice_id = req.voice if req.voice in _VOICE_MAP else DEFAULT_VOICE
    text = text[:4000]

    global _EDGE_BLOCKED

    def _piper_result(voice_for_piper: str, audio_bytes: bytes) -> "AlignedTTSResponse":
        return AlignedTTSResponse(
            audioBase64=base64.b64encode(audio_bytes).decode("ascii"),
            contentType="audio/wav",
            text=text,
            boundaries=[],
        )

    if not _is_edge(voice_id):
        loop = asyncio.get_event_loop()
        audio_bytes = await loop.run_in_executor(None, _synthesize_piper, voice_id, text, req.speed)
        return _piper_result(voice_id, audio_bytes)

    if not _EDGE_BLOCKED:
        try:
            edge_voice = voice_id[5:]
            audio_bytes, boundaries = await _synthesize_edge_with_boundaries(edge_voice, text, req.speed)
            return AlignedTTSResponse(
                audioBase64=base64.b64encode(audio_bytes).decode("ascii"),
                contentType="audio/mpeg",
                text=text,
                boundaries=boundaries,
            )
        except Exception as exc:
            err_str = str(exc)
            if "403" in err_str or "Invalid response" in err_str or "wss://" in err_str:
                _EDGE_BLOCKED = True
            logger.warning("TTS aligned: Edge TTS falló (%s), usando Piper sin boundaries", exc)

    fallback = _piper_fallback_for(voice_id)
    if not fallback:
        raise HTTPException(status_code=503, detail="El servicio de voz no está disponible")
    loop = asyncio.get_event_loop()
    audio_bytes = await loop.run_in_executor(None, _synthesize_piper, fallback, text, req.speed)
    return _piper_result(fallback, audio_bytes)
