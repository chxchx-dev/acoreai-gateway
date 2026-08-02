import logging

from faster_whisper import WhisperModel

from app.config import settings

logger = logging.getLogger(__name__)


class WhisperModelManager:
    """Dueño del ciclo de vida de la instancia de faster-whisper."""

    def __init__(self) -> None:
        self._model: WhisperModel | None = None

    def load(self) -> None:
        logger.info(
            "Cargando Whisper model=%s device=%s compute=%s …",
            settings.whisper_model, settings.whisper_device, settings.whisper_compute,
        )
        self._model = WhisperModel(
            settings.whisper_model,
            device=settings.whisper_device,
            compute_type=settings.whisper_compute,
        )
        logger.info("Whisper listo.")

    def unload(self) -> None:
        self._model = None

    @property
    def is_ready(self) -> bool:
        return self._model is not None

    @property
    def model(self) -> WhisperModel:
        if self._model is None:
            raise RuntimeError("Whisper model no está cargado")
        return self._model


whisper_manager = WhisperModelManager()
