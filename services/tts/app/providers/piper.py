import logging
import os
import subprocess
import tempfile
import urllib.request

from app.config import settings
from app.voices_catalog import VOICE_MAP

logger = logging.getLogger(__name__)


class PiperProvider:
    """Sintetiza voz localmente con el binario Piper, descargando el modelo
    de la voz bajo demanda si todavía no está en caché de disco."""

    def _model_paths(self, voice_id: str) -> tuple[str, str]:
        onnx = os.path.join(settings.models_dir, f"{voice_id}.onnx")
        return onnx, onnx + ".json"

    def _ensure_model(self, voice_id: str) -> str:
        info = VOICE_MAP.get(voice_id)
        if not info or not info.get("url_path"):
            raise ValueError(f"Voz Piper desconocida: {voice_id}")

        onnx_path, cfg_path = self._model_paths(voice_id)
        base_url = f"{settings.hf_base}/{info['url_path']}/{voice_id}"

        for dest, url in [(onnx_path, f"{base_url}.onnx"), (cfg_path, f"{base_url}.onnx.json")]:
            if os.path.exists(dest):
                continue
            logger.info("Descargando %s …", url)
            tmp = dest + ".tmp"
            try:
                urllib.request.urlretrieve(url, tmp)
                os.replace(tmp, dest)
            except Exception as exc:
                if os.path.exists(tmp):
                    os.remove(tmp)
                raise RuntimeError(f"Error descargando {url}: {exc}") from exc

        return onnx_path

    def synthesize(self, voice_id: str, text: str, speed: float) -> bytes:
        """Llamada bloqueante — debe invocarse desde un executor cuando se
        llama desde código async."""
        onnx_path = self._ensure_model(voice_id)
        length_scale = str(round(1.0 / max(speed, 0.1), 4))

        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False, dir="/tmp") as tmp:
            tmp_path = tmp.name
        try:
            result = subprocess.run(
                [settings.piper_bin, "--model", onnx_path, "--output_file", tmp_path,
                 "--length_scale", length_scale, "--espeak_data", settings.espeak_data],
                input=text.encode("utf-8"),
                capture_output=True,
                timeout=120,
            )
            if result.returncode != 0:
                raise RuntimeError(f"piper error: {result.stderr.decode(errors='replace')}")
            with open(tmp_path, "rb") as f:
                return f.read()
        finally:
            if os.path.exists(tmp_path):
                os.unlink(tmp_path)


piper_provider = PiperProvider()
