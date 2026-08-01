from kokoro import KPipeline
import soundfile as sf

pipeline = KPipeline(lang_code="e")

text = """
Hola, soy Alana y soy la asistente virtual de Olán, Academic
"""

generator = pipeline(
    text,
    voice="ef_dora",
    speed=1.0
)

for i, (_, _, audio) in enumerate(generator):
    sf.write(f"salida_{i}.wav", audio, 24000)