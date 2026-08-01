FROM ollama/ollama:0.22.1

ENV HOME=/home/ollama
ENV OLLAMA_MODELS=/models

RUN mkdir -p /home/ollama/.ollama /models \
    && chown -R 10001:10001 /home/ollama /models

USER 10001:10001
