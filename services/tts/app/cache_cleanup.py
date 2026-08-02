import asyncio
import logging
import os
import time

from app.cache_service import tts_cache
from app.config import settings

logger = logging.getLogger(__name__)

_CLEANUP_INTERVAL_SECONDS = 300


async def run_cache_cleanup_loop() -> None:
    while True:
        await asyncio.sleep(_CLEANUP_INTERVAL_SECONDS)
        try:
            _evict_expired_files()
        except Exception as exc:
            logger.warning("Cleanup error: %s", exc)


def _evict_expired_files() -> None:
    now = time.time()
    for filename in os.listdir(settings.cache_dir):
        if not (filename.endswith(".wav") or filename.endswith(".mp3")):
            continue
        fpath = os.path.join(settings.cache_dir, filename)
        if now - os.path.getmtime(fpath) > settings.cache_ttl_seconds:
            os.remove(fpath)
            stem = filename.rsplit(".", 1)[0]
            tts_cache.delete_by_stem(stem)
