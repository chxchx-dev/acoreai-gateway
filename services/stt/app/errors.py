class TranscriptionServiceError(Exception):
    """Error base del pipeline de transcripción."""


class ModelNotReadyError(TranscriptionServiceError):
    """Se lanza cuando llega una petición antes de que el modelo Whisper esté cargado."""


class EmptyAudioError(TranscriptionServiceError):
    """Se lanza cuando el archivo de audio recibido está vacío."""
