from pydantic import BaseModel

from app.voices_catalog import DEFAULT_VOICE


class TTSRequest(BaseModel):
    text: str
    voice: str = DEFAULT_VOICE
    speed: float = 1.0


class AlignedTTSResponse(BaseModel):
    audioBase64: str
    contentType: str
    text: str
    boundaries: list[dict]


class HealthResponse(BaseModel):
    status: str
    piper_binary: bool
    piper_models_cached: list[str]
    edge_tts: str


class VoicesResponse(BaseModel):
    voices: dict[str, list[dict]]
