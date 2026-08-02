# Catálogo de voces.
# Prefijo "edge:" → Edge TTS (online, Microsoft Neural)
# Sin prefijo     → Piper TTS (local, requiere descarga del modelo)

VOICES_CATALOG: dict[str, list[dict]] = {
    "es": [
        # ── Edge TTS · Latinoamérica (online) ──
        {"id": "edge:es-MX-DaliaNeural",    "name": "Dalia ☁️ MX",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-CO-SalomeNeural",   "name": "Salomé ☁️ CO",     "gender": "female", "provider": "edge"},
        {"id": "edge:es-AR-ElenaNeural",    "name": "Elena ☁️ AR",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-CL-CatalinaNeural", "name": "Catalina ☁️ CL",   "gender": "female", "provider": "edge"},
        {"id": "edge:es-VE-PaolaNeural",    "name": "Paola ☁️ VE",      "gender": "female", "provider": "edge"},
        {"id": "edge:es-PE-CamilaNeural",   "name": "Camila ☁️ PE",     "gender": "female", "provider": "edge"},
        {"id": "edge:es-MX-JorgeNeural",    "name": "Jorge ☁️ MX",      "gender": "male",   "provider": "edge"},
        {"id": "edge:es-CO-GonzaloNeural",  "name": "Gonzalo ☁️ CO",    "gender": "male",   "provider": "edge"},
        # ── Piper · México (local) ──
        {"id": "es_MX-ines-medium",         "name": "Inés 🖥️ MX",       "gender": "female", "provider": "piper", "url_path": "es/es_MX/ines/medium"},
        {"id": "es_MX-ines-low",            "name": "Inés low 🖥️ MX",   "gender": "female", "provider": "piper", "url_path": "es/es_MX/ines/low"},
        {"id": "es_MX-ald-medium",          "name": "Ald 🖥️ MX",        "gender": "male",   "provider": "piper", "url_path": "es/es_MX/ald/medium"},
        {"id": "es_MX-claude-high",         "name": "Claude HD 🖥️ MX",  "gender": "male",   "provider": "piper", "url_path": "es/es_MX/claude/high"},
    ],
    "en": [
        {"id": "en_US-lessac-medium",       "name": "Lessac 🖥️",        "gender": "female", "provider": "piper", "url_path": "en/en_US/lessac/medium"},
        {"id": "en_US-ryan-medium",         "name": "Ryan 🖥️",          "gender": "male",   "provider": "piper", "url_path": "en/en_US/ryan/medium"},
        {"id": "en_US-amy-medium",          "name": "Amy 🖥️",           "gender": "female", "provider": "piper", "url_path": "en/en_US/amy/medium"},
        {"id": "en_GB-alan-medium",         "name": "Alan GB 🖥️",       "gender": "male",   "provider": "piper", "url_path": "en/en_GB/alan/medium"},
        {"id": "edge:en-US-JennyNeural",    "name": "Jenny ☁️",         "gender": "female", "provider": "edge"},
        {"id": "edge:en-US-GuyNeural",      "name": "Guy ☁️",           "gender": "male",   "provider": "edge"},
    ],
    "fr": [
        {"id": "fr_FR-siwis-medium",        "name": "Siwis 🖥️",         "gender": "female", "provider": "piper", "url_path": "fr/fr_FR/siwis/medium"},
        {"id": "fr_FR-gilles-low",          "name": "Gilles 🖥️",        "gender": "male",   "provider": "piper", "url_path": "fr/fr_FR/gilles/low"},
        {"id": "edge:fr-FR-DeniseNeural",   "name": "Denise ☁️",        "gender": "female", "provider": "edge"},
    ],
    "de": [
        {"id": "de_DE-thorsten-medium",     "name": "Thorsten 🖥️",      "gender": "male",   "provider": "piper", "url_path": "de/de_DE/thorsten/medium"},
        {"id": "de_DE-eva_k-x_low",         "name": "Eva 🖥️",           "gender": "female", "provider": "piper", "url_path": "de/de_DE/eva_k/x_low"},
        {"id": "edge:de-DE-KatjaNeural",    "name": "Katja ☁️",         "gender": "female", "provider": "edge"},
    ],
    "pt": [
        {"id": "pt_BR-faber-medium",        "name": "Faber 🖥️ BR",      "gender": "male",   "provider": "piper", "url_path": "pt/pt_BR/faber/medium"},
        {"id": "edge:pt-BR-FranciscaNeural","name": "Francisca ☁️ BR",  "gender": "female", "provider": "edge"},
    ],
    "zh": [
        {"id": "zh_CN-huayan-medium",       "name": "Huayan 🖥️",        "gender": "female", "provider": "piper", "url_path": "zh/zh_CN/huayan/medium"},
        {"id": "edge:zh-CN-XiaoxiaoNeural", "name": "Xiaoxiao ☁️",      "gender": "female", "provider": "edge"},
    ],
    "it": [
        {"id": "it_IT-riccardo-x_low",      "name": "Riccardo 🖥️",      "gender": "male",   "provider": "piper", "url_path": "it/it_IT/riccardo/x_low"},
        {"id": "edge:it-IT-ElsaNeural",     "name": "Elsa ☁️",          "gender": "female", "provider": "edge"},
    ],
    "ja": [
        {"id": "ja_JP-kokoro-medium",       "name": "Kokoro 🖥️",        "gender": "female", "provider": "piper", "url_path": "ja/ja_JP/kokoro/medium"},
        {"id": "edge:ja-JP-NanamiNeural",   "name": "Nanami ☁️",        "gender": "female", "provider": "edge"},
    ],
    "ko": [
        {"id": "ko_KR-kss-high",            "name": "Kss 🖥️",           "gender": "female", "provider": "piper", "url_path": "ko/ko_KR/kss/high"},
        {"id": "edge:ko-KR-SunHiNeural",    "name": "SunHi ☁️",         "gender": "female", "provider": "edge"},
    ],
    "ru": [
        {"id": "ru_RU-ruslan-medium",       "name": "Ruslan 🖥️",        "gender": "male",   "provider": "piper", "url_path": "ru/ru_RU/ruslan/medium"},
        {"id": "edge:ru-RU-SvetlanaNeural", "name": "Svetlana ☁️",      "gender": "female", "provider": "edge"},
    ],
    "hi": [
        {"id": "hi_IN-sangita-medium",      "name": "Sangita 🖥️",       "gender": "female", "provider": "piper", "url_path": "hi/hi_IN/sangita/medium"},
        {"id": "edge:hi-IN-SwaraNeural",    "name": "Swara ☁️",         "gender": "female", "provider": "edge"},
    ],
}

DEFAULT_VOICE = "edge:es-PE-CamilaNeural"

VOICE_MAP: dict[str, dict] = {
    v["id"]: {**v, "lang": lang}
    for lang, voices in VOICES_CATALOG.items()
    for v in voices
}


def is_edge_voice(voice_id: str) -> bool:
    return voice_id.startswith("edge:")


def audio_extension(voice_id: str) -> str:
    return "mp3" if is_edge_voice(voice_id) else "wav"


def content_type_for(voice_id: str) -> str:
    return "audio/mpeg" if is_edge_voice(voice_id) else "audio/wav"


def resolve_voice_id(requested_voice: str) -> str:
    return requested_voice if requested_voice in VOICE_MAP else DEFAULT_VOICE


def piper_fallback_for(voice_id: str) -> str | None:
    """Devuelve el primer voice_id de Piper del mismo idioma, o None."""
    info = VOICE_MAP.get(voice_id)
    if not info:
        return None
    for voice in VOICES_CATALOG.get(info["lang"], []):
        if voice.get("provider") == "piper":
            return voice["id"]
    return None
