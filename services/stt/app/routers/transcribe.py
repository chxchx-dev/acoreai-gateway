from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.errors import EmptyAudioError, ModelNotReadyError, TranscriptionServiceError
from app.schemas import TranscriptionResponse
from app.transcription_service import TranscriptionService
from app.whisper_model import whisper_manager

router = APIRouter()

_service = TranscriptionService(whisper_manager)


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe(
    file: UploadFile = File(...),
    language: str = Form("es"),
) -> TranscriptionResponse:
    content = await file.read()
    try:
        return await _service.transcribe(content, file.content_type, file.filename, language)
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except EmptyAudioError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except TranscriptionServiceError as exc:
        raise HTTPException(status_code=500, detail=f"Error en transcripción: {exc}") from exc
