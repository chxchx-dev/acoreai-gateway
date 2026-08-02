import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.routers import health, transcribe
from app.whisper_model import whisper_manager

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    whisper_manager.load()
    yield
    whisper_manager.unload()


app = FastAPI(title="ACOREAI STT Service", lifespan=lifespan)
app.include_router(health.router)
app.include_router(transcribe.router)
