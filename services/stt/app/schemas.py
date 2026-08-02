from pydantic import BaseModel


class TranscriptionResponse(BaseModel):
    text: str
    language: str
    duration: float


class HealthResponse(BaseModel):
    status: str
    model: str
    device: str
