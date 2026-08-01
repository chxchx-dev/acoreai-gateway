import logging
import os
import tempfile
from contextlib import asynccontextmanager

from faster_whisper import WhisperModel
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.responses import JSONResponse

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

MODEL_SIZE = os.getenv("WHISPER_MODEL", "medium")  # tiny | base | small | medium | large-v3
DEVICE     = os.getenv("WHISPER_DEVICE", "cpu")
COMPUTE    = os.getenv("WHISPER_COMPUTE", "int8")  # int8 en CPU, float16 en GPU

# Prompts iniciales por idioma para guiar a Whisper y evitar alucinaciones
INITIAL_PROMPTS: dict[str, str] = {
    "es": "Esta es una conversación en español.",
    "en": "This is a conversation in English.",
    "fr": "C'est une conversation en français.",
    "pt": "Esta é uma conversa em português.",
    "de": "Dies ist ein Gespräch auf Deutsch.",
    "it": "Questa è una conversazione in italiano.",
    "zh": "这是一段中文对话。",
    "ja": "これは日本語の会話です。",
    "ko": "이것은 한국어 대화입니다.",
    "ru": "Это разговор на русском языке.",
    "ar": "هذه محادثة باللغة العربية.",
    "hi": "यह हिंदी में एक बातचीत है।",
}

_model: WhisperModel | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model
    logger.info("Cargando Whisper model=%s device=%s compute=%s …", MODEL_SIZE, DEVICE, COMPUTE)
    _model = WhisperModel(MODEL_SIZE, device=DEVICE, compute_type=COMPUTE)
    logger.info("Whisper listo.")
    yield
    _model = None


app = FastAPI(title="OLAN STT Service", lifespan=lifespan)

CT_TO_EXT = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/flac": ".flac",
}


@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_SIZE, "device": DEVICE}


@app.post("/transcribe")
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("es"),
):
    if _model is None:
        raise HTTPException(status_code=503, detail="Modelo no cargado")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="Archivo de audio vacío")

    # Detectar extensión: primero por content-type, luego por nombre de archivo
    ct = (file.content_type or "").lower().strip()
    ext = CT_TO_EXT.get(ct)
    if not ext and file.filename:
        fname_ext = os.path.splitext(file.filename)[1].lower()
        if fname_ext in {".webm", ".ogg", ".wav", ".mp3", ".m4a", ".flac", ".mp4"}:
            ext = fname_ext
    ext = ext or ".webm"

    # Idioma: None = auto-detección por Whisper
    lang = language if language not in ("", "auto") else None

    # Prompt inicial según idioma para mejorar precisión y evitar cambios de idioma
    initial_prompt = INITIAL_PROMPTS.get(lang or "es") if lang else None

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        tmp.write(content)
        tmp_path = tmp.name

    try:
        logger.info(
            "Transcribiendo %d bytes, lang=%s, ext=%s, model=%s",
            len(content), lang or "auto", ext, MODEL_SIZE,
        )
        segments, info = _model.transcribe(
            tmp_path,
            language=lang,
            initial_prompt=initial_prompt,
            beam_size=5,
            patience=1.0,
            temperature=0.0,          # determinista: elimina variabilidad aleatoria
            vad_filter=True,
            vad_parameters={
                "min_silence_duration_ms": 300,   # menos agresivo para habla natural
                "speech_pad_ms": 400,             # no corta el final de palabras
            },
            condition_on_previous_text=True,      # contexto entre segmentos
            no_speech_threshold=0.6,
            compression_ratio_threshold=2.4,
        )
        text = " ".join(s.text.strip() for s in segments).strip()
        logger.info("Transcripcion (%s, %.1fs): %r", info.language, info.duration, text[:120])
        return JSONResponse({"text": text, "language": info.language, "duration": info.duration})
    except Exception as exc:
        logger.error("Error transcribiendo: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error en transcripción: {exc}") from exc
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass
