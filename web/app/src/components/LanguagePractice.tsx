import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Loader2, Mic, MicOff, Pause, PhoneOff, Play, Send, Square, VolumeX } from 'lucide-react';
import { streamChat, transcribeAudio, synthesizeSpeech, getConversationMessages } from '../lib/gateway';
import { ENGLISH_LEVELS, type EnglishLevelDef, type EnglishLevelKey, type TopicCategory } from '../lib/prompt';
import { Markdown, stripMarkdown } from './Markdown';
import type { DemoUser } from '../lib/auth';

type Phase = 'idle' | 'listening' | 'transcribing' | 'thinking' | 'speaking';
type Turn  = { role: 'user' | 'assistant'; text: string; hasCorrection?: boolean; hasCelebration?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  user: DemoUser;
  model: string;
  onConversationChange: (id: string, level: string) => void;
  resumeConversationId?: string | null;
  resumeLevel?: string | null;
  autoStartTopic?: { starter: string; levelKey: EnglishLevelKey } | null;
};

const levelEmoji: Record<EnglishLevelKey, string> = {
  Principiante: '🌱',
  Aprendiz:     '⭐',
  Explorador:   '🚀',
};


function detectsCorrection(text: string) {
  return /\b(almost|so close|we say|we'd say|should be|not quite|instead of|the correct|try saying|close!)\b/i.test(text);
}

function detectsCelebration(text: string) {
  return /\b(amazing|excellent|perfect|fantastic|awesome|brilliant|great job|well done|superb|wonderful|you got it|correct|exactly right)\b/i.test(text);
}

function extractChunk(text: string): { chunk: string | null; rest: string } {
  const m = text.match(/^([\s\S]{20,}?[.!?])\s+([\s\S]*)/);
  if (m) return { chunk: m[1].trim(), rest: m[2] };
  if (text.length > 65) {
    const m2 = text.match(/^([\s\S]{35,}?[,;:])\s+([\s\S]*)/);
    if (m2) return { chunk: m2[1].trim(), rest: m2[2] };
    const cut = text.indexOf(' ', 82);
    if (cut !== -1) return { chunk: text.slice(0, cut), rest: text.slice(cut + 1) };
  }
  return { chunk: null, rest: text };
}

export function LanguagePractice({ open, onClose, user, model, onConversationChange, resumeConversationId, resumeLevel, autoStartTopic }: Props) {
  const [phase,        setPhase]        = useState<Phase>('idle');
  const [levelIdx,     setLevelIdx]     = useState(0);
  const [turns,        setTurns]        = useState<Turn[]>([]);
  const [liveText,     setLiveText]     = useState('');
  const [textInput,    setTextInput]    = useState('');
  const [error,        setError]        = useState('');
  const [celebration,  setCelebration]  = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  type ReplayStatus = 'loading' | 'playing' | 'paused';
  const [replayState,      setReplayState]      = useState<{ idx: number; status: ReplayStatus } | null>(null);
  const [liveAudioPaused,  setLiveAudioPaused]  = useState(false);
  const replayCtxRef = useRef<AudioContext | null>(null);
  const replaySrcRef = useRef<AudioBufferSourceNode | null>(null);

  const practiceConvIdRef = useRef<string | null>(null);
  const modelRef          = useRef(model);
  const levelIdxRef       = useRef(levelIdx);

  useEffect(() => { modelRef.current    = model;    }, [model]);
  useEffect(() => { levelIdxRef.current = levelIdx; }, [levelIdx]);
  useEffect(() => { practiceConvIdRef.current = null; }, [levelIdx]);

  type QEntry = { buf: ArrayBuffer | null; skipped: boolean };
  const queueRef       = useRef<QEntry[]>([]);
  const headRef        = useRef(0);
  const playingRef     = useRef(false);
  const streamDoneRef  = useRef(false);
  const audioCtxRef    = useRef<AudioContext | null>(null);
  const srcRef         = useRef<AudioBufferSourceNode | null>(null);
  const assistBufRef   = useRef('');
  const pendingRef     = useRef('');
  const recorderRef    = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const chatAbortRef   = useRef<AbortController | null>(null);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [turns, liveText]);

  function stopAudio() {
    try { srcRef.current?.stop(); }       catch { void 0; }
    try { audioCtxRef.current?.close(); } catch { void 0; }
    srcRef.current = audioCtxRef.current = null;
    playingRef.current = false;
  }

  function cleanPipeline() {
    chatAbortRef.current?.abort();
    setLiveAudioPaused(false);
    stopAudio();
    try { recorderRef.current?.stop(); } catch { void 0; }
    recorderRef.current    = null;
    queueRef.current       = [];
    headRef.current        = 0;
    streamDoneRef.current  = false;
    pendingRef.current     = '';
    assistBufRef.current   = '';
  }

  async function pauseLiveAudio()  { await audioCtxRef.current?.suspend(); setLiveAudioPaused(true);  }
  async function resumeLiveAudio() { await audioCtxRef.current?.resume();  setLiveAudioPaused(false); }

  function stopReplay() {
    try { replaySrcRef.current?.stop(); } catch { void 0; }
    try { replayCtxRef.current?.close(); } catch { void 0; }
    replaySrcRef.current = null;
    replayCtxRef.current = null;
    setReplayState(null);
  }
  async function pauseReplay()  { await replayCtxRef.current?.suspend(); setReplayState(s => s ? { ...s, status: 'paused'  } : null); }
  async function resumeReplay() { await replayCtxRef.current?.resume();  setReplayState(s => s ? { ...s, status: 'playing' } : null); }

  const playTurn = useCallback(async (text: string, idx: number) => {
    stopReplay();
    setReplayState({ idx, status: 'loading' });
    try {
      const buf     = await synthesizeSpeech(stripMarkdown(text), 'edge:en-US-JennyNeural', 1.0);
      const ctx     = new AudioContext();
      replayCtxRef.current = ctx;
      const decoded = await ctx.decodeAudioData(buf);
      const src     = ctx.createBufferSource();
      src.buffer    = decoded;
      src.connect(ctx.destination);
      replaySrcRef.current = src;
      src.onended = () => { ctx.close(); replaySrcRef.current = null; replayCtxRef.current = null; setReplayState(null); };
      src.start();
      setReplayState({ idx, status: 'playing' });
    } catch { setReplayState(null); }
  }, []);

  function schedulePlay() {
    if (playingRef.current) return;
    const q = queueRef.current;
    while (headRef.current < q.length && q[headRef.current].skipped) headRef.current++;
    if (headRef.current >= q.length) { if (streamDoneRef.current) onAllSpoken(); return; }
    const entry = q[headRef.current];
    if (entry.buf === null) return;
    playingRef.current = true;
    headRef.current++;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    ctx.decodeAudioData(entry.buf.slice(0))
      .then(decoded => {
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
        setPhase('speaking');
      })
      .catch(() => { ctx.close(); playingRef.current = false; schedulePlay(); });
  }

  function pushTTS(text: string) {
    const entry: QEntry = { buf: null, skipped: false };
    queueRef.current.push(entry);
    synthesizeSpeech(text, 'edge:en-US-JennyNeural', 1.0)
      .then(buf => { entry.buf = buf; schedulePlay(); })
      .catch(()  => { entry.skipped = true; schedulePlay(); });
  }

  function onAllSpoken() {
    const full = assistBufRef.current;
    if (full) {
      const isCelebrating = detectsCelebration(full);
      setTurns(prev => [...prev, { role: 'assistant', text: full, hasCorrection: detectsCorrection(full), hasCelebration: isCelebrating }]);
      if (isCelebrating) { setCelebration(true); window.setTimeout(() => setCelebration(false), 2500); }
    }
    setLiveText('');
    assistBufRef.current  = '';
    pendingRef.current    = '';
    queueRef.current      = [];
    headRef.current       = 0;
    streamDoneRef.current = false;
    playingRef.current    = false;
    setPhase('idle');
  }

  async function runChat(question: string) {
    setPhase('thinking');
    setLiveText('');
    assistBufRef.current  = '';
    pendingRef.current    = '';
    queueRef.current      = [];
    headRef.current       = 0;
    streamDoneRef.current = false;
    playingRef.current    = false;

    const ctrl = new AbortController();
    chatAbortRef.current  = ctrl;
    const currentLevel    = ENGLISH_LEVELS[levelIdxRef.current]?.key ?? 'Principiante';
    let localPending      = '';

    try {
      const result = await streamChat(
        { question, model: modelRef.current, userId: user.id, authToken: user.token, conversationId: practiceConvIdRef.current, mode: 'practice', practiceLevel: currentLevel },
        token => {
          assistBufRef.current += token;
          localPending += token;
          setLiveText(t => t + token);
          const { chunk, rest } = extractChunk(localPending);
          if (chunk) { localPending = rest; pushTTS(stripMarkdown(chunk)); }
        },
        ctrl.signal,
      );
      if (result.conversationId) {
        practiceConvIdRef.current = result.conversationId;
        onConversationChange(result.conversationId, currentLevel);
      }
      const flush = localPending.trim();
      if (flush) pushTTS(stripMarkdown(flush));
      streamDoneRef.current = true;
      schedulePlay();
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError('Error al conectar. Intenta de nuevo.');
      setPhase('idle');
    }
  }

  async function startListening() {
    setPhase('listening');
    setError('');
    try {
      const stream   = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4']
        .find(t => MediaRecorder.isTypeSupported(t)) ?? '';
      const rec = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      audioChunksRef.current = [];
      rec.ondataavailable = e => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: rec.mimeType || 'audio/webm' });
        if (blob.size < 100) { setPhase('idle'); return; }
        setPhase('transcribing');
        try {
          const text    = await transcribeAudio(blob, 'en');
          const trimmed = text.trim();
          if (!trimmed) { setPhase('idle'); return; }
          sendQuestion(trimmed);
        } catch { setError('No se pudo transcribir.'); setPhase('idle'); }
      };
      recorderRef.current = rec;
      rec.start(200);
    } catch (err) {
      setError((err as Error).name === 'NotAllowedError' ? 'Permiso de micrófono denegado.' : 'No se pudo acceder al micrófono.');
      setPhase('idle');
    }
  }

  function stopListening() { recorderRef.current?.stop(); recorderRef.current = null; }

  function handleInterrupt() {
    chatAbortRef.current?.abort();
    stopAudio();
    queueRef.current      = [];
    headRef.current       = 0;
    streamDoneRef.current = false;
    const partial = assistBufRef.current.trim();
    if (partial) setTurns(prev => [...prev, { role: 'assistant', text: partial, hasCorrection: detectsCorrection(partial) }]);
    setLiveText('');
    assistBufRef.current = '';
    pendingRef.current   = '';
    setPhase('idle');
  }

  function handleOrbClick() {
    if (phase === 'idle')      { startListening();  return; }
    if (phase === 'listening') { stopListening();   return; }
    if (phase === 'speaking' || phase === 'thinking') { handleInterrupt(); }
  }

  function resetToHome() {
    cleanPipeline();
    setPhase('idle');
    setTurns([]);
    setLiveText('');
    setError('');
    setTextInput('');
    onClose();
  }

  function sendQuestion(text: string) {
    const q = text.trim();
    if (!q) return;
    setTurns(prev => [...prev, { role: 'user', text: q }]);
    runChat(q);
  }

  async function handleTextSubmit(e: FormEvent) {
    e.preventDefault();
    const q = textInput.trim();
    if (!q || phase === 'thinking' || phase === 'speaking') return;
    setTextInput('');
    sendQuestion(q);
  }

  useEffect(() => {
    if (!open) {
      cleanPipeline();
      setPhase('idle');
      setTurns([]);
      setLiveText('');
      setError('');
      setTextInput('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!resumeConversationId) return;
    practiceConvIdRef.current = resumeConversationId;
    if (resumeLevel) {
      const idx = ENGLISH_LEVELS.findIndex(l => l.key === resumeLevel);
      if (idx >= 0) setLevelIdx(idx);
    }
    getConversationMessages(resumeConversationId, user.id, user.token)
      .then(msgs => {
        const loaded = msgs.map(m => ({
          role: m.role as 'user' | 'assistant',
          text: m.content,
          hasCorrection: detectsCorrection(m.content),
          hasCelebration: detectsCelebration(m.content),
        }));
        setTurns(loaded);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeConversationId]);

  useEffect(() => {
    if (!autoStartTopic || !open) return;
    const idx = ENGLISH_LEVELS.findIndex(l => l.key === autoStartTopic.levelKey);
    if (idx >= 0) setLevelIdx(idx);
    const tid = window.setTimeout(() => { sendQuestion(autoStartTopic.starter); }, 120);
    return () => window.clearTimeout(tid);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStartTopic]);

  if (!open) return null;

  const level: EnglishLevelDef = ENGLISH_LEVELS[levelIdx];
  const isBusy     = phase === 'thinking' || phase === 'speaking' || phase === 'transcribing';
  const isEmpty    = turns.length === 0 && !liveText;
  const isOrbActive = ['idle', 'listening', 'speaking', 'thinking'].includes(phase);

  const orbLabel = {
    idle:         'Toca para hablar',
    listening:    'Grabando… toca para enviar',
    transcribing: 'Procesando…',
    thinking:     'ACoreAI está pensando…',
    speaking:     'ACoreAI está hablando…',
  }[phase] ?? '';

  return (
    <div className="lp-root">

      {/* ── Celebration burst ── */}
      {celebration && (
        <div className="lp-burst" aria-live="polite">
          <span>🏆</span><span>⭐</span><span>🎉</span>
          <span className="lp-burst-text">Amazing!</span>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="lp-body">

        {isEmpty ? (
          <div className="lp-landing">

            {/* Level selector */}
            <div className="lp-level-row">
              {ENGLISH_LEVELS.map((l, idx) => (
                <button
                  key={l.key}
                  type="button"
                  className={`lp-level-card${levelIdx === idx ? ' lp-level-card--active' : ''}`}
                  style={{ '--lc': l.color } as React.CSSProperties}
                  onClick={() => !isBusy && setLevelIdx(idx)}
                  disabled={isBusy}
                >
                  <span className="lp-level-emoji">{levelEmoji[l.key]}</span>
                  <span className="lp-level-name">{l.key}</span>
                  <span className="lp-level-desc">{l.desc}</span>
                </button>
              ))}
            </div>

            {/* Categories + topics */}
            <div className="lp-categories">
              {level.categories.map((cat: TopicCategory) => (
                <div key={cat.label} className="lp-category">
                  <div className="lp-category-header">
                    <span className="lp-category-emoji">{cat.emoji}</span>
                    <span className="lp-category-label">{cat.label}</span>
                  </div>
                  <div className="lp-topic-grid">
                    {cat.topics.map(t => (
                      <button
                        key={t.label}
                        type="button"
                        className="lp-topic-tile"
                        style={{ '--lc': level.color } as React.CSSProperties}
                        onClick={() => !isBusy && sendQuestion(t.starter)}
                        disabled={isBusy}
                      >
                        <span className="lp-tile-emoji">{t.emoji}</span>
                        <span className="lp-tile-label">{t.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

        ) : (
          <div className="lp-chat" ref={transcriptRef}>
            <button type="button" className="lp-back-btn" onClick={resetToHome}>
              ← Topics
            </button>

            {turns.map((t, i) => (
              <div key={i} className={`lp-bubble lp-bubble--${t.role}`}>
                <div className="lp-bubble-meta">
                  <span className="lp-bubble-who">
                    {t.role === 'user' ? '🙋 Tú' : '✨ ACoreAI'}
                  </span>
                  {t.hasCelebration && (
                    <span className="lp-badge lp-badge--celebrate">🏆 Excellent!</span>
                  )}
                  {t.hasCorrection && !t.hasCelebration && (
                    <span className="lp-badge lp-badge--tip">💡 Tip</span>
                  )}
                </div>
                <p className="lp-bubble-text">{t.text}</p>
                <div className="lp-replay-controls">
                  {replayState?.idx === i && replayState.status === 'loading' && (
                    <span className="lp-replay-btn lp-replay-btn--loading">
                      <Loader2 size={11} className="lp-spin" />
                    </span>
                  )}
                  {(replayState?.idx !== i || replayState.status === 'paused') && replayState?.status !== 'loading' && (
                    <button
                      type="button"
                      className="lp-replay-btn"
                      title={replayState?.idx === i && replayState.status === 'paused' ? 'Reanudar' : 'Escuchar'}
                      onClick={() => replayState?.idx === i && replayState.status === 'paused' ? resumeReplay() : playTurn(t.text, i)}
                    >
                      <Play size={11} />
                    </button>
                  )}
                  {replayState?.idx === i && replayState.status === 'playing' && (
                    <button type="button" className="lp-replay-btn lp-replay-btn--active" title="Pausar" onClick={pauseReplay}>
                      <Pause size={11} />
                    </button>
                  )}
                  {replayState?.idx === i && replayState.status !== 'loading' && (
                    <button type="button" className="lp-replay-btn lp-replay-btn--stop" title="Detener" onClick={stopReplay}>
                      <Square size={11} />
                    </button>
                  )}
                </div>
              </div>
            ))}

            {liveText && (
              <div className="lp-bubble lp-bubble--assistant lp-bubble--live">
                <div className="lp-bubble-meta">
                  <span className="lp-bubble-who">✨ ACoreAI</span>
                </div>
                <div className="lp-live-text">
                  <Markdown content={liveText} streaming />
                  <span className="lp-cursor" />
                </div>
                {(phase === 'speaking' || liveAudioPaused) && (
                  <div className="lp-replay-controls" style={{ opacity: 1 }}>
                    {liveAudioPaused ? (
                      <button type="button" className="lp-replay-btn" title="Reanudar" onClick={resumeLiveAudio}><Play size={11} /></button>
                    ) : (
                      <button type="button" className="lp-replay-btn lp-replay-btn--active" title="Pausar" onClick={pauseLiveAudio}><Pause size={11} /></button>
                    )}
                    <button type="button" className="lp-replay-btn lp-replay-btn--stop" title="Detener" onClick={handleInterrupt}><Square size={11} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Bottom bar ── */}
      <div className="lp-bar">
        {/* Status / error */}
        <p className="lp-bar-status">{error || orbLabel}</p>

        {/* Text input */}
        <form className="lp-text-row" onSubmit={handleTextSubmit}>
          <input
            className="lp-text-input"
            type="text"
            value={textInput}
            onChange={e => setTextInput(e.target.value)}
            placeholder="Or type here…"
            disabled={isBusy}
          />
          <button
            type="submit"
            className="lp-text-send"
            disabled={!textInput.trim() || isBusy}
            aria-label="Enviar"
          >
            <Send size={15} />
          </button>
        </form>

        {/* Mic orb row */}
        <div className="lp-orb-row">
          {(phase === 'speaking' || phase === 'thinking') && (
            <button type="button" className="lp-pill lp-pill--stop" onClick={handleInterrupt}>
              <VolumeX size={13} /> Interrumpir
            </button>
          )}

          <button
            type="button"
            className={`lp-orb lp-orb--${phase}`}
            style={{ '--lc': level.color } as React.CSSProperties}
            onClick={isOrbActive ? handleOrbClick : undefined}
            disabled={phase === 'transcribing'}
            aria-label={orbLabel}
          >
            {(phase === 'transcribing' || phase === 'thinking') && <Loader2 size={26} className="lp-spin" />}
            {phase === 'listening' && <MicOff size={26} />}
            {phase === 'speaking'  && <VolumeX size={26} />}
            {phase === 'idle'      && <Mic size={26} />}
          </button>

          {!isEmpty && (
            <button type="button" className="lp-pill lp-pill--exit" onClick={resetToHome}>
              <PhoneOff size={13} /> Salir
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
