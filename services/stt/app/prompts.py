# Prompts iniciales por idioma para guiar a Whisper y evitar alucinaciones
INITIAL_PROMPTS: dict[str, str] = {
    "es": "Esta es una conversación en español.",
    "en": "This is a conversation in English.",
    "fr": "C'est une conversation en français.",
    "pt": "Esta é uma conversa em português.",
    "de": "Dies ist ein Gespräch auf Deutsch.",
    "it": "Questa è una conversazione in italiano.",
    "zh": "这是一段中文对话。",
    "ja": "これは日本語の会話です。",
    "ko": "이것은 한국어 대화입니다.",
    "ru": "Это разговор на русском языке.",
    "ar": "هذه محادثة باللغة العربية.",
    "hi": "यह हिंदी में एक बातचीत है।",
}


def get_initial_prompt(language: str | None) -> str | None:
    return INITIAL_PROMPTS.get(language) if language else None
