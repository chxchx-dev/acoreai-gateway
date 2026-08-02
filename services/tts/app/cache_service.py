import logging
from datetime import datetime, timedelta, timezone

from pymongo import MongoClient
from pymongo.collection import Collection

from app.config import settings

logger = logging.getLogger(__name__)


class TTSCacheService:
    """Registra en MongoDB los metadatos del audio generado para que el loop
    de limpieza pueda encontrar y evictar del disco los archivos vencidos."""

    def __init__(self) -> None:
        self._client: MongoClient | None = None
        self._collection: Collection | None = None

    def connect(self) -> None:
        try:
            self._client = MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)
            self._client.admin.command("ping")
            self._collection = self._client[settings.mongodb_db]["tts_cache"]
            self._collection.create_index("key", unique=True)
            self._collection.create_index("expiresAt", expireAfterSeconds=0)
            logger.info("MongoDB conectado: %s / %s", settings.mongodb_uri, settings.mongodb_db)
        except Exception as exc:
            logger.warning("MongoDB no disponible: %s", exc)
            self._client = None
            self._collection = None

    def close(self) -> None:
        if self._client:
            self._client.close()

    def find_fresh(self, key: str) -> dict | None:
        if self._collection is None:
            return None
        try:
            return self._collection.find_one({"key": key, "expiresAt": {"$gt": datetime.now(timezone.utc)}})
        except Exception as exc:
            logger.warning("MongoDB cache error: %s", exc)
            return None

    def invalidate(self, key: str) -> None:
        if self._collection is None:
            return
        self._collection.delete_one({"key": key})

    def upsert(self, key: str, voice: str, path: str) -> None:
        if self._collection is None:
            return
        try:
            self._collection.update_one(
                {"key": key},
                {
                    "$set": {
                        "key": key,
                        "voice": voice,
                        "path": path,
                        "updatedAt": datetime.now(timezone.utc),
                        "expiresAt": datetime.now(timezone.utc) + timedelta(seconds=settings.cache_ttl_seconds),
                    },
                    "$setOnInsert": {"createdAt": datetime.now(timezone.utc)},
                },
                upsert=True,
            )
        except Exception as exc:
            logger.warning("MongoDB set error: %s", exc)

    def delete_by_stem(self, stem: str) -> None:
        if self._collection is None:
            return
        self._collection.delete_one({"key": stem})


tts_cache = TTSCacheService()
