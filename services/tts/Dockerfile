FROM python:3.11.13-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    wget tar ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Instalar el binario Piper (incluye espeak-ng-data integrado)
ARG PIPER_VERSION=2023.11.14-2
ARG TARGETARCH=amd64
RUN ARCH_TAG=$([ "$TARGETARCH" = "arm64" ] && echo "aarch64" || echo "x86_64") && \
    wget -q "https://github.com/rhasspy/piper/releases/download/${PIPER_VERSION}/piper_linux_${ARCH_TAG}.tar.gz" \
         -O /tmp/piper.tar.gz && \
    tar -xzf /tmp/piper.tar.gz -C /opt && \
    ln -s /opt/piper/piper /usr/local/bin/piper && \
    rm /tmp/piper.tar.gz

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

WORKDIR /app
COPY main.py .

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /home/app --create-home app \
    && mkdir -p /home/app/.cache/piper /app/tts_cache \
    && chown -R app:app /home/app /app/tts_cache

ENV HOME=/home/app
ENV XDG_CACHE_HOME=/home/app/.cache
ENV PIPER_MODELS_DIR=/home/app/.cache/piper

USER app

EXPOSE 8880
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8880"]
