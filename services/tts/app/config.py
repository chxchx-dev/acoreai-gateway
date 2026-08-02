import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    models_dir: str = os.getenv("PIPER_MODELS_DIR", "/home/app/.cache/piper")
    cache_dir: str = os.getenv("TTS_CACHE_DIR", "/app/tts_cache")
    cache_ttl_seconds: int = 1800
    piper_bin: str = "/opt/piper/piper"
    espeak_data: str = "/opt/piper/espeak-ng-data"
    mongodb_uri: str = os.getenv("MONGODB_URI", "mongodb://mongodb:27017/acoreai_ai_gateway")
    mongodb_db: str = os.getenv("MONGODB_DB", "acoreai_ai_gateway")
    hf_base: str = "https://huggingface.co/rhasspy/piper-voices/resolve/v1.0.0"


settings = Settings()

os.makedirs(settings.models_dir, exist_ok=True)
os.makedirs(settings.cache_dir, exist_ok=True)
