import base64
import logging

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.errors import VoiceUnavailableError
from app.schemas import AlignedTTSResponse, TTSRequest
from app.tts_service import tts_service

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/tts")
async def synthesize(req: TTSRequest) -> Response:
    try:
        result = await tts_service.synthesize(req.text, req.voice, req.speed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        logger.error("Error TTS: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error generando audio: {exc}") from exc

    headers = {"X-TTS-Cache": "hit" if result.cache_hit else "miss"}
    if not result.cache_hit:
        headers["X-TTS-Voice-Used"] = result.voice_used
        if result.fallback:
            headers["X-TTS-Fallback"] = "piper"
    return Response(content=result.audio, media_type=result.content_type, headers=headers)


@router.post("/tts/aligned", response_model=AlignedTTSResponse)
async def synthesize_aligned(req: TTSRequest) -> AlignedTTSResponse:
    try:
        result = await tts_service.synthesize_aligned(req.text, req.voice, req.speed)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except VoiceUnavailableError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc

    return AlignedTTSResponse(
        audioBase64=base64.b64encode(result.audio).decode("ascii"),
        contentType=result.content_type,
        text=result.text,
        boundaries=result.boundaries,
    )
