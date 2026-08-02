import edge_tts


class EdgeProvider:
    """Sintetiza voz online usando las voces neuronales de Microsoft Edge."""

    @staticmethod
    def _rate(speed: float) -> str:
        rate_pct = int((speed - 1.0) * 100)
        return f"+{rate_pct}%" if rate_pct >= 0 else f"{rate_pct}%"

    async def synthesize(self, voice_name: str, text: str, speed: float) -> bytes:
        communicate = edge_tts.Communicate(text, voice_name, rate=self._rate(speed))
        chunks: list[bytes] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
        if not chunks:
            raise RuntimeError("Edge TTS no devolvió audio")
        return b"".join(chunks)

    async def synthesize_with_boundaries(
        self, voice_name: str, text: str, speed: float
    ) -> tuple[bytes, list[dict]]:
        """Igual que synthesize, pero además captura los eventos WordBoundary
        que emite Edge TTS durante el streaming, para poder resaltar palabra por
        palabra en el cliente mientras se reproduce el audio."""
        # edge-tts >= 7.x por defecto solo emite SentenceBoundary; hay que pedir
        # WordBoundary explícitamente para poder resaltar palabra por palabra.
        communicate = edge_tts.Communicate(text, voice_name, rate=self._rate(speed), boundary="WordBoundary")
        chunks: list[bytes] = []
        boundaries: list[dict] = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                chunks.append(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                # offset/duration vienen en unidades de 100ns (ticks) → ms
                boundaries.append({
                    "offsetMs": chunk["offset"] / 10_000,
                    "durationMs": chunk["duration"] / 10_000,
                    "text": chunk["text"],
                })
        if not chunks:
            raise RuntimeError("Edge TTS no devolvió audio")
        return b"".join(chunks), boundaries


edge_provider = EdgeProvider()
