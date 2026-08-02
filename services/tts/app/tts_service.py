import asyncio
import hashlib
import logging
import os
from dataclasses import dataclass

from app.cache_service import tts_cache
from app.config import settings
from app.errors import VoiceUnavailableError
from app.markdown import strip_markdown
from app.providers.edge import edge_provider
from app.providers.piper import piper_provider
from app.voices_catalog import (
    audio_extension,
    content_type_for,
    is_edge_voice,
    piper_fallback_for,
    resolve_voice_id,
)

logger = logging.getLogger(__name__)

_MAX_TEXT_LENGTH = 4000


@dataclass
class SynthesisResult:
    audio: bytes
    content_type: str
    cache_hit: bool
    voice_used: str
    requested_voice: str

    @property
    def fallback(self) -> bool:
        return self.voice_used != self.requested_voice


@dataclass
class AlignedSynthesisResult:
    audio: bytes
    content_type: str
    text: str
    boundaries: list[dict]


class TTSService:
    """Coordina la selección de proveedor (Edge → fallback Piper), la limpieza
    de texto y la caché de audio (disco + MongoDB) usada por /tts."""

    def __init__(self) -> None:
        self._edge_blocked = False  # una vez confirmado el bloqueo, evitar reintentos

    @staticmethod
    def _cache_key(text: str, voice: str, speed: float) -> str:
        return hashlib.sha256(f"{text}|{voice}|{speed:.2f}".encode()).hexdigest()

    @staticmethod
    def _audio_path(key: str, voice_id: str) -> str:
        return os.path.join(settings.cache_dir, f"{key}.{audio_extension(voice_id)}")

    @staticmethod
    def _prepare_text(raw_text: str) -> str:
        return strip_markdown(raw_text.strip())[:_MAX_TEXT_LENGTH]

    @staticmethod
    def _is_edge_blocked_error(exc: Exception) -> bool:
        err_str = str(exc)
        return "403" in err_str or "Invalid response" in err_str or "wss://" in err_str

    @staticmethod
    async def _run_piper(voice_id: str, text: str, speed: float) -> bytes:
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, piper_provider.synthesize, voice_id, text, speed)

    async def synthesize(self, text: str, voice: str, speed: float) -> SynthesisResult:
        clean_text = self._prepare_text(text)
        if not clean_text:
            raise ValueError("Texto vacío tras limpiar markdown")

        voice_id = resolve_voice_id(voice)
        key = self._cache_key(clean_text, voice_id, speed)
        fpath = self._audio_path(key, voice_id)
        content_type = content_type_for(voice_id)

        cached = tts_cache.find_fresh(key)
        if cached and os.path.exists(fpath):
            logger.info("TTS cache hit %s… voz=%s", key[:8], voice_id)
            with open(fpath, "rb") as f:
                return SynthesisResult(f.read(), content_type, True, voice_id, voice_id)
        tts_cache.invalidate(key)

        logger.info("TTS generando %s… voz=%s", key[:8], voice_id)
        actual_voice_id, audio_bytes, content_type = await self._generate(voice_id, clean_text, speed)

        fpath = self._audio_path(key, actual_voice_id)
        with open(fpath, "wb") as f:
            f.write(audio_bytes)
        tts_cache.upsert(key, actual_voice_id, fpath)

        return SynthesisResult(audio_bytes, content_type, False, actual_voice_id, voice_id)

    async def _generate(self, voice_id: str, text: str, speed: float) -> tuple[str, bytes, str]:
        if is_edge_voice(voice_id) and not self._edge_blocked:
            try:
                audio_bytes = await edge_provider.synthesize(voice_id[5:], text, speed)
                return voice_id, audio_bytes, "audio/mpeg"
            except Exception as edge_exc:
                if not self._is_edge_blocked_error(edge_exc):
                    raise
                self._edge_blocked = True
                fallback = piper_fallback_for(voice_id)
                if not fallback:
                    raise VoiceUnavailableError(
                        f"Edge TTS bloqueado y sin fallback Piper: {edge_exc}"
                    ) from edge_exc
                logger.warning("Edge TTS bloqueado (403) → fallback Piper: %s", fallback)
                audio_bytes = await self._run_piper(fallback, text, speed)
                return fallback, audio_bytes, "audio/wav"

        if is_edge_voice(voice_id) and self._edge_blocked:
            fallback = piper_fallback_for(voice_id)
            if not fallback:
                raise VoiceUnavailableError("Edge TTS bloqueado (VPS) y sin voz Piper de respaldo")
            logger.info("Edge TTS bloqueado, usando Piper: %s", fallback)
            audio_bytes = await self._run_piper(fallback, text, speed)
            return fallback, audio_bytes, "audio/wav"

        audio_bytes = await self._run_piper(voice_id, text, speed)
        return voice_id, audio_bytes, "audio/wav"

    async def synthesize_aligned(self, text: str, voice: str, speed: float) -> AlignedSynthesisResult:
        """Como synthesize, pero además devuelve el timing por palabra (WordBoundary)
        para que el cliente pueda resaltar la lectura en sincronía con el audio.
        Solo Edge TTS emite esos eventos; con voces Piper se devuelve boundaries=[]."""
        clean_text = self._prepare_text(text)
        if not clean_text:
            raise ValueError("Texto vacío tras limpiar markdown")

        voice_id = resolve_voice_id(voice)

        if not is_edge_voice(voice_id):
            audio_bytes = await self._run_piper(voice_id, clean_text, speed)
            return AlignedSynthesisResult(audio_bytes, "audio/wav", clean_text, [])

        if not self._edge_blocked:
            try:
                audio_bytes, boundaries = await edge_provider.synthesize_with_boundaries(
                    voice_id[5:], clean_text, speed
                )
                return AlignedSynthesisResult(audio_bytes, "audio/mpeg", clean_text, boundaries)
            except Exception as exc:
                if self._is_edge_blocked_error(exc):
                    self._edge_blocked = True
                logger.warning("TTS aligned: Edge TTS falló (%s), usando Piper sin boundaries", exc)

        fallback = piper_fallback_for(voice_id)
        if not fallback:
            raise VoiceUnavailableError("El servicio de voz no está disponible")
        audio_bytes = await self._run_piper(fallback, clean_text, speed)
        return AlignedSynthesisResult(audio_bytes, "audio/wav", clean_text, [])


tts_service = TTSService()
