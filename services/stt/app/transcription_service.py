import logging
import os
import tempfile

from app.audio_format import resolve_extension
from app.config import settings
from app.errors import EmptyAudioError, ModelNotReadyError, TranscriptionServiceError
from app.prompts import get_initial_prompt
from app.schemas import TranscriptionResponse
from app.whisper_model import WhisperModelManager

logger = logging.getLogger(__name__)


class TranscriptionService:
    """Orquesta la transcripción: valida la entrada, persiste el audio en un
    archivo temporal y delega la inferencia al modelo Whisper."""

    def __init__(self, model_manager: WhisperModelManager) -> None:
        self._model_manager = model_manager

    async def transcribe(
        self,
        content: bytes,
        content_type: str | None,
        filename: str | None,
        language: str,
    ) -> TranscriptionResponse:
        if not self._model_manager.is_ready:
            raise ModelNotReadyError("Modelo no cargado")
        if not content:
            raise EmptyAudioError("Archivo de audio vacío")

        ext = resolve_extension(content_type, filename)
        lang = language if language not in ("", "auto") else None
        initial_prompt = get_initial_prompt(lang)

        with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
            tmp.write(content)
            tmp_path = tmp.name

        try:
            logger.info(
                "Transcribiendo %d bytes, lang=%s, ext=%s, model=%s",
                len(content), lang or "auto", ext, settings.whisper_model,
            )
            segments, info = self._model_manager.model.transcribe(
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
            return TranscriptionResponse(text=text, language=info.language, duration=info.duration)
        except Exception as exc:
            logger.error("Error transcribiendo: %s", exc)
            raise TranscriptionServiceError(str(exc)) from exc
        finally:
            try:
                os.unlink(tmp_path)
            except OSError:
                pass
