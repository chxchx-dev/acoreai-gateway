import os

from fastapi import APIRouter

from app.config import settings
from app.schemas import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    piper_ok = os.path.isfile(settings.piper_bin) and os.access(settings.piper_bin, os.X_OK)
    cached_models = [f[:-5] for f in os.listdir(settings.models_dir) if f.endswith(".onnx")]
    return HealthResponse(
        status="ok",
        piper_binary=piper_ok,
        piper_models_cached=cached_models,
        edge_tts="available",
    )
