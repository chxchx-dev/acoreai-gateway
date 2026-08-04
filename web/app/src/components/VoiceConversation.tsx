import { useEffect, useRef, useState } from "react";
import {
  AudioLines,
  Loader2,
  Mic,
  MicOff,
  PhoneOff,
  VolumeX,
} from "lucide-react";
import {
  streamChat,
  transcribeAudio,
  synthesizeSpeech,
  getConversationMessages,
} from "../lib/gateway";
import { Markdown, stripMarkdown } from "./Markdown";
import type { DemoUser } from "../lib/auth";

type Phase = "idle" | "listening" | "transcribing" | "thinking" | "speaking";
type Turn = { role: "user" | "assistant"; text: string };

type Props = {
  open: boolean;
  onClose: () => void;
  user: DemoUser;
  model: string;
  modelLabel: string;
  conversationId: string | null;
  onConversationChange: (id: string) => void;
};

function extractChunk(text: string): { chunk: string | null; rest: string } {
  const m = text.match(/^([\s\S]{20,}?[.!?])\s+([\s\S]*)/);
  if (m) return { chunk: m[1].trim(), rest: m[2] };
  if (text.length > 65) {
    const m2 = text.match(/^([\s\S]{35,}?[,;:])\s+([\s\S]*)/);
    if (m2) return { chunk: m2[1].trim(), rest: m2[2] };
    const cut = text.indexOf(" ", 82);
    if (cut !== -1)
      return { chunk: text.slice(0, cut), rest: text.slice(cut + 1) };
  }
  return { chunk: null, rest: text };
}

export function VoiceConversation({
  open,
  onClose,
  user,
  model,
  modelLabel,
  conversationId,
  onConversationChange,
}: Props) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [liveText, setLiveText] = useState("");
  const [error, setError] = useState("");
  const transcriptRef = useRef<HTMLDivElement>(null);

  const modelRef = useRef(model);
  const convIdRef = useRef(conversationId);
  useEffect(() => {
    modelRef.current = model;
  }, [model]);
  useEffect(() => {
    convIdRef.current = conversationId;
  }, [conversationId]);

  // Cargar historial al abrir con conversación existente
  useEffect(() => {
    if (!open || !conversationId) return;
    getConversationMessages(conversationId, user.id, user.token)
      .then((msgs) => {
        setTurns(msgs.map((m) => ({ role: m.role, text: m.content })));
      })
      .catch(() => { });
  }, [open, conversationId, user.id, user.token]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatAbortRef = useRef<AbortController | null>(null);

  type QEntry = { buf: ArrayBuffer | null; skipped: boolean };
  const queueRef = useRef<QEntry[]>([]);
  const headRef = useRef(0);
  const playingRef = useRef(false);
  const streamDoneRef = useRef(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const srcRef = useRef<AudioBufferSourceNode | null>(null);
  const assistantBufRef = useRef("");
  const pendingRef = useRef("");

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns, liveText]);

  function stopAudio() {
    try {
      srcRef.current?.stop();
    } catch {
      /* ok */
    }
    try {
      audioCtxRef.current?.close();
    } catch {
      /* ok */
    }
    srcRef.current = audioCtxRef.current = null;
    playingRef.current = false;
  }

  function cleanPipeline() {
    chatAbortRef.current?.abort();
    stopAudio();
    try {
      recorderRef.current?.stop();
    } catch {
      /* ok */
    }
    recorderRef.current = null;
    queueRef.current = [];
    headRef.current = 0;
    streamDoneRef.current = false;
    pendingRef.current = "";
    assistantBufRef.current = "";
  }

  function schedulePlay() {
    if (playingRef.current) return;
    const q = queueRef.current;
    while (headRef.current < q.length && q[headRef.current].skipped)
      headRef.current++;
    if (headRef.current >= q.length) {
      if (streamDoneRef.current) onAllSpoken();
      return;
    }
    const entry = q[headRef.current];
    if (entry.buf === null) return;

    playingRef.current = true;
    headRef.current++;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;

    ctx
      .decodeAudioData(entry.buf.slice(0))
      .then((decoded) => {
        const src = ctx.createBufferSource();
        src.buffer = decoded;
        src.connect(ctx.destination);
        srcRef.current = src;
        src.onended = () => {
          if (audioCtxRef.current === ctx) audioCtxRef.current = null;
          ctx.close();
          playingRef.current = false;
          schedulePlay();
        };
        src.start();
        setPhase("speaking");
      })
      .catch(() => {
        ctx.close();
        playingRef.current = false;
        schedulePlay();
      });
  }

  function pushTTS(text: string) {
    const entry: QEntry = { buf: null, skipped: false };
    queueRef.current.push(entry);
    synthesizeSpeech(text, "ef_dora", 1.0)
      .then((buf) => {
        entry.buf = buf;
        schedulePlay();
      })
      .catch(() => {
        entry.skipped = true;
        schedulePlay();
      });
  }

  function onAllSpoken() {
    const full = assistantBufRef.current;
    if (full) setTurns((prev) => [...prev, { role: "assistant", text: full }]);
    setLiveText("");
    assistantBufRef.current = "";
    pendingRef.current = "";
    queueRef.current = [];
    headRef.current = 0;
    streamDoneRef.current = false;
    playingRef.current = false;
    setPhase("idle");
  }

  async function runChat(question: string) {
    setPhase("thinking");
    setLiveText("");
    assistantBufRef.current = "";
    pendingRef.current = "";
    queueRef.current = [];
    headRef.current = 0;
    streamDoneRef.current = false;
    playingRef.current = false;

    const ctrl = new AbortController();
    chatAbortRef.current = ctrl;
    let localPending = "";

    try {
      const result = await streamChat(
        {
          question,
          model: modelRef.current,
          userId: user.id,
          authToken: user.token,
          conversationId: convIdRef.current,
          mode: 'voice',
        },
        (token) => {
          assistantBufRef.current += token;
          localPending += token;
          setLiveText((t) => t + token);
          const { chunk, rest } = extractChunk(localPending);
          if (chunk) {
            localPending = rest;
            pushTTS(stripMarkdown(chunk));
          }
        },
        ctrl.signal,
      );
      if (result.conversationId) {
        convIdRef.current = result.conversationId;
        onConversationChange(result.conversationId);
      }
      const flush = localPending.trim();
      if (flush) pushTTS(stripMarkdown(flush));
      streamDoneRef.current = true;
      schedulePlay();
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setError("Error al conectar. Reintentando...");
      window.setTimeout(() => startListening(), 2500);
    }
  }

  async function startListening() {
    setPhase("listening");
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";
      const rec = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: rec.mimeType || "audio/webm",
        });
        if (blob.size < 100) {
          setPhase("idle");
          return;
        }
        setPhase("transcribing");
        try {
          const text = await transcribeAudio(blob, "es");
          const trimmed = text.trim();
          if (!trimmed) {
            setPhase("idle");
            return;
          }
          setTurns((prev) => [...prev, { role: "user", text: trimmed }]);
          await runChat(trimmed);
        } catch {
          setError("No se pudo transcribir.");
          setPhase("idle");
        }
      };
      recorderRef.current = rec;
      rec.start(200);
    } catch (err) {
      setError(
        (err as Error).name === "NotAllowedError"
          ? "Permiso de micrófono denegado."
          : "No se pudo acceder al micrófono.",
      );
    }
  }

  function stopListening() {
    recorderRef.current?.stop();
    recorderRef.current = null;
  }

  function handleInterrupt() {
    chatAbortRef.current?.abort();
    stopAudio();
    queueRef.current = [];
    headRef.current = 0;
    streamDoneRef.current = false;
    const partial = assistantBufRef.current.trim();
    if (partial)
      setTurns((prev) => [...prev, { role: "assistant", text: partial }]);
    setLiveText("");
    assistantBufRef.current = "";
    pendingRef.current = "";
    setPhase("idle");
  }

  function handleOrbClick() {
    if (phase === "idle") {
      startListening();
      return;
    }
    if (phase === "listening") {
      stopListening();
      return;
    }
    if (phase === "speaking" || phase === "thinking") {
      handleInterrupt();
    }
  }

  useEffect(() => {
    if (!open) {
      cleanPipeline();
      setPhase("idle");
      setTurns([]);
      setLiveText("");
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  if (!open) return null;

  const isOrbClickable =
    phase === "idle" ||
    phase === "listening" ||
    phase === "speaking" ||
    phase === "thinking";

  const orbLabel = {
    idle: "Toca para hablar",
    listening: "Grabando... toca para enviar",
    transcribing: "Procesando tu voz...",
    thinking: "ACoreAI está pensando...",
    speaking: "ACoreAI está respondiendo...",
  }[phase];

  return (
    <>
      {/* ── Área principal: orb + transcript ── */}
      <section className="vc-content">
        <div className="vc-stage">
          {/* Orb — botón principal */}
          <button
            className={`vc-orb vc-orb--${phase} ${isOrbClickable ? "vc-orb--tap" : ""}`}
            onClick={isOrbClickable ? handleOrbClick : undefined}
            aria-label={orbLabel}
            disabled={phase === "transcribing"}
          >
            {(phase === "transcribing" || phase === "thinking") && (
              <Loader2 size={30} className="vc-spin-icon" />
            )}
            {phase === "listening" && <MicOff size={30} />}
            {phase === "speaking" && <VolumeX size={30} />}
            {phase === "idle" && <Mic size={30} />}
          </button>

          <p className="vc-status">{error || orbLabel}</p>
        </div>

        {/* Transcript */}
        <div className="vc-transcript" ref={transcriptRef}>
          {turns.length === 0 && !liveText && (
            <p className="vc-hint">Toca el botón para comenzar</p>
          )}
          {turns.map((t, i) => (
            <div key={i} className={`vc-turn vc-turn--${t.role}`}>
              <span className="vc-who">
                {t.role === "user" ? "Tú" : "ACoreAI"}
              </span>
              <p>{t.text}</p>
            </div>
          ))}
          {liveText && (
            <div className="vc-turn vc-turn--assistant vc-turn--live">
              <span className="vc-who">ACoreAI</span>
              <div className="vc-live-markdown">
                <Markdown content={liveText} streaming />
                <span className="vc-cursor" />
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── Barra inferior ── */}
      <div className="vc-bar">
        <span className="vc-bar-label">
          <span
            className={`vc-live-dot ${phase === "listening" ? "active" : ""}`}
          />
          Modo Voz · {modelLabel}
        </span>

        <div className="vc-bar-actions">
          {(phase === "speaking" || phase === "thinking") && (
            <button className="vc-btn vc-btn--ghost" onClick={handleInterrupt}>
              <VolumeX size={15} />
              Interrumpir
            </button>
          )}
        </div>

        <button
          className="vc-exit"
          onClick={() => {
            cleanPipeline();
            onClose();
          }}
          aria-label="Salir del modo voz"
        >
          <PhoneOff size={16} />
          Salir
        </button>
      </div>
    </>
  );
}
