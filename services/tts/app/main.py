import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.cache_cleanup import run_cache_cleanup_loop
from app.cache_service import tts_cache
from app.routers import health, synthesize, voices

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    tts_cache.connect()
    cleanup_task = asyncio.create_task(run_cache_cleanup_loop())
    yield
    cleanup_task.cancel()
    tts_cache.close()


app = FastAPI(lifespan=lifespan)
app.include_router(health.router)
app.include_router(voices.router)
app.include_router(synthesize.router)
