import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    whisper_model: str = os.getenv("WHISPER_MODEL", "medium")  # tiny | base | small | medium | large-v3
    whisper_device: str = os.getenv("WHISPER_DEVICE", "cpu")
    whisper_compute: str = os.getenv("WHISPER_COMPUTE", "int8")  # int8 en CPU, float16 en GPU


settings = Settings()
