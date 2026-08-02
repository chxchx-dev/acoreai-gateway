class TTSServiceError(Exception):
    """Error base del pipeline de síntesis de voz."""


class VoiceUnavailableError(TTSServiceError):
    """Se lanza cuando ningún proveedor (Edge o Piper) puede generar audio para una voz."""
