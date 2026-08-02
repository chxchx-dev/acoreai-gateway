from fastapi import APIRouter

from app.schemas import VoicesResponse
from app.voices_catalog import VOICES_CATALOG

router = APIRouter()


@router.get("/voices", response_model=VoicesResponse)
async def list_voices() -> VoicesResponse:
    return VoicesResponse(voices=VOICES_CATALOG)
