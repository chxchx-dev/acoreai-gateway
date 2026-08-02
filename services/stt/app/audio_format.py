import os

CONTENT_TYPE_TO_EXT: dict[str, str] = {
    "audio/webm": ".webm",
    "audio/webm;codecs=opus": ".webm",
    "audio/ogg": ".ogg",
    "audio/ogg;codecs=opus": ".ogg",
    "audio/wav": ".wav",
    "audio/wave": ".wav",
    "audio/x-wav": ".wav",
    "audio/mpeg": ".mp3",
    "audio/mp3": ".mp3",
    "audio/mp4": ".m4a",
    "audio/m4a": ".m4a",
    "audio/x-m4a": ".m4a",
    "audio/flac": ".flac",
}

_KNOWN_EXTENSIONS = {".webm", ".ogg", ".wav", ".mp3", ".m4a", ".flac", ".mp4"}
_DEFAULT_EXTENSION = ".webm"


def resolve_extension(content_type: str | None, filename: str | None) -> str:
    """Determina la extensión del archivo: primero por content-type, luego por nombre."""
    ct = (content_type or "").lower().strip()
    ext = CONTENT_TYPE_TO_EXT.get(ct)
    if not ext and filename:
        fname_ext = os.path.splitext(filename)[1].lower()
        if fname_ext in _KNOWN_EXTENSIONS:
            ext = fname_ext
    return ext or _DEFAULT_EXTENSION
