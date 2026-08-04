import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  AudioLines,
  Bookmark,
  BookmarkCheck,
  Brain,
  Check,
  ChevronDown,
  ChevronRight,
  Copy,
  Languages,
  Layers,
  Lightbulb,
  Loader2,
  Menu,
  MessageSquare,
  MessageSquarePlus,
  Mic,
  MicOff,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Search,
  Send,
  ArrowLeftRight,
  RotateCcw,
  Square,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Trash2,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react";
import { LoginScreen } from "./components/LoginScreen";
import { Markdown, stripMarkdown } from "./components/Markdown";
import { MaterialCommunityIcons } from "./components/MaterialCommunityIcons";
import { Settings } from "./components/Settings";
import { VoiceConversation } from "./components/VoiceConversation";
import { LanguagePractice } from "./components/LanguagePractice";
import { AiOnboardingWizard, LEVEL_LABELS, PRACTICE_LABELS } from "./components/ai-onboarding/AiOnboardingWizard";
import {
  clearStoredUser,
  readStoredUser,
  storeUser,
  PLAN_LABELS,
  type DemoUser,
} from "./lib/auth";
import {
  loadProfile,
  clearProfile,
  fetchAndCacheProfile,
  completeOnboardingWithApi,
  updateProfileWithApi,
} from "./lib/aiProfile";
import type { UserAiProfile } from "./types/ai-profile";
import {
  ApiError,
  askRag,
  deleteConversation,
  deleteTranslationFromServer,
  fetchHealth,
  getConversationMessages,
  listConversations,
  listConversationsBySourcePrefix,
  listTranslationHistory,
  saveTranslationToServer,
  generateDailySuggestion,
  streamChat,
  streamPerspectives,
  synthesizeSpeech,
  transcribeAudio,
  translateTextStream,
  type ChatMessage,
  type Conversation,
  type DailySuggestion,
  type PerspectiveMeta,
  type PerspectivesResult,
  type RagSource,
  type SavedTranslation,
} from "./lib/gateway";
import { safeRandomUUID } from "./lib/uuid";
import { ACOREAI_MASTER_PROMPT, ENGLISH_LEVELS, type EnglishLevelKey, type EnglishLevelDef, type TopicCategory } from "./lib/prompt";
const acoreai = undefined;
const acoreaiHola = undefined;
const acoreaiIdea = undefined;
const acoreaiUps = undefined;
const logoAiACoreAI = undefined;

type ModeKey = "fast" | "deep";
type TabKey = "chat" | "translate";
type ThemeKey = "dark" | "light";

type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  streaming?: boolean;
  error?: boolean;
  kind?: "text" | "perspectives" | "rag";
  perspectives?: PerspectiveMeta[];
  activePerspIdx?: number;
  question?: string;
  sources?: Array<{ documentId: string; chunkId: string; title: string; chunkIndex: number; score?: number; sourceUrl?: string }>;
  ragSources?: RagSource[];
  ragUsedKnowledge?: boolean;
};

type PerspectiveSource = NonNullable<UiMessage["sources"]>[number];

const MODES: Record<
  ModeKey,
  { label: string; model: string; icon: typeof Zap; hint: string; desc: string; iconBg: string; iconColor: string }
> = {
  fast: {
    label: "Ligero",
    model: "llama3.2:3b",
    icon: Zap,
    hint: "Respuestas rapidas para investigacion diaria.",
    desc: "Respuestas rápidas y directas, ideal para consultas cotidianas.",
    iconBg: "rgba(0, 212, 170, 0.12)",
    iconColor: "var(--accent)",
  },
  deep: {
    label: "Experto",
    model: "qwen3:4b",
    icon: Brain,
    hint: "Analisis mas completo para planeacion y materiales.",
    desc: "Análisis profundo para planeación académica y temas complejos.",
    iconBg: "rgba(124, 92, 232, 0.12)",
    iconColor: "var(--accent-3)",
  },
};

const TRANSLATION_MODEL = "translategemma:4b";
const SPEECH_PRACTICE_MODEL = "llama3.2:3b";

// Un idioma = una entrada. key es lo que se envía al gateway de traducción.
const LANGUAGES: { key: string; label: string; flag: string; voice: string }[] =
  [
    {
      key: "espanol",
      label: "Español",
      flag: "🇨🇴",
      voice: "edge:es-CO-SalomeNeural",
    },
    {
      key: "ingles",
      label: "Inglés",
      flag: "🇺🇸",
      voice: "edge:en-US-JennyNeural",
    },
    {
      key: "frances",
      label: "Francés",
      flag: "🇫🇷",
      voice: "edge:fr-FR-DeniseNeural",
    },
    {
      key: "aleman",
      label: "Alemán",
      flag: "🇩🇪",
      voice: "edge:de-DE-KatjaNeural",
    },
    {
      key: "italiano",
      label: "Italiano",
      flag: "🇮🇹",
      voice: "edge:it-IT-ElsaNeural",
    },
    {
      key: "portugues",
      label: "Portugués",
      flag: "🇧🇷",
      voice: "edge:pt-BR-FranciscaNeural",
    },
    {
      key: "chino",
      label: "Chino",
      flag: "🇨🇳",
      voice: "edge:zh-CN-XiaoxiaoNeural",
    },
    {
      key: "japones",
      label: "Japonés",
      flag: "🇯🇵",
      voice: "edge:ja-JP-NanamiNeural",
    },
    {
      key: "coreano",
      label: "Coreano",
      flag: "🇰🇷",
      voice: "edge:ko-KR-SunHiNeural",
    },
    {
      key: "ruso",
      label: "Ruso",
      flag: "🇷🇺",
      voice: "edge:ru-RU-SvetlanaNeural",
    },
    {
      key: "hindi",
      label: "Hindi",
      flag: "🇮🇳",
      voice: "edge:hi-IN-SwaraNeural",
    },
  ];

function makeConvoStarter(topic: string, style?: string): string {
  switch (style) {
    case 'roleplay':             return `Hagamos un roleplay en inglés sobre ${topic}`;
    case 'interview':            return `Simula una entrevista en inglés donde hablo de ${topic}`;
    case 'academic_presentation':return `Voy a presentar en inglés mis ideas sobre ${topic}, corrígeme y mejórame`;
    case 'qa':                   return `Hazme preguntas en inglés sobre ${topic} para practicar mi nivel`;
    case 'guided_situations':    return `Guíame en una situación en inglés relacionada con ${topic}`;
    default:                     return `Hablemos en inglés sobre ${topic} de manera natural`;
  }
}

// Maps profile interest strings → relevant ENGLISH_LEVELS topics
const INTEREST_TOPIC_MAP: Record<string, { levelKey: EnglishLevelKey; topicLabel: string }[]> = {
  'tecnología':      [{ levelKey: 'Explorador', topicLabel: 'Technology' }, { levelKey: 'Explorador', topicLabel: 'Media' }, { levelKey: 'Aprendiz', topicLabel: 'Tech' }],
  'ciencia':         [{ levelKey: 'Explorador', topicLabel: 'Science' }, { levelKey: 'Explorador', topicLabel: 'Space' }, { levelKey: 'Explorador', topicLabel: 'Environment' }],
  'historia':        [{ levelKey: 'Explorador', topicLabel: 'History' }, { levelKey: 'Explorador', topicLabel: 'Culture' }],
  'filosofía':       [{ levelKey: 'Explorador', topicLabel: 'Ethics' }, { levelKey: 'Explorador', topicLabel: 'Debate' }, { levelKey: 'Explorador', topicLabel: 'Psychology' }],
  'arte':            [{ levelKey: 'Explorador', topicLabel: 'Art' }, { levelKey: 'Explorador', topicLabel: 'Stories' }],
  'economía':        [{ levelKey: 'Explorador', topicLabel: 'Economics' }, { levelKey: 'Explorador', topicLabel: 'Future' }],
  'cultura':         [{ levelKey: 'Explorador', topicLabel: 'Culture' }, { levelKey: 'Aprendiz', topicLabel: 'Travel' }, { levelKey: 'Aprendiz', topicLabel: 'City' }],
  'salud':           [{ levelKey: 'Aprendiz', topicLabel: 'Health' }, { levelKey: 'Explorador', topicLabel: 'Sports' }],
  'música':          [{ levelKey: 'Aprendiz', topicLabel: 'Music' }, { levelKey: 'Explorador', topicLabel: 'Art' }],
  'deporte':         [{ levelKey: 'Explorador', topicLabel: 'Sports' }, { levelKey: 'Aprendiz', topicLabel: 'Sports' }],
  'deportes':        [{ levelKey: 'Explorador', topicLabel: 'Sports' }, { levelKey: 'Aprendiz', topicLabel: 'Sports' }],
  'medio ambiente':  [{ levelKey: 'Explorador', topicLabel: 'Environment' }, { levelKey: 'Explorador', topicLabel: 'Science' }],
  'educación':       [{ levelKey: 'Explorador', topicLabel: 'Education' }, { levelKey: 'Explorador', topicLabel: 'Future' }],
  'psicología':      [{ levelKey: 'Explorador', topicLabel: 'Psychology' }, { levelKey: 'Explorador', topicLabel: 'Debate' }],
  'política':        [{ levelKey: 'Explorador', topicLabel: 'Debate' }, { levelKey: 'Explorador', topicLabel: 'Ethics' }],
  'matemáticas':     [{ levelKey: 'Explorador', topicLabel: 'Science' }, { levelKey: 'Explorador', topicLabel: 'Economics' }],
  'astronomía':      [{ levelKey: 'Explorador', topicLabel: 'Space' }, { levelKey: 'Explorador', topicLabel: 'Science' }],
  'cine':            [{ levelKey: 'Aprendiz', topicLabel: 'Movies' }, { levelKey: 'Explorador', topicLabel: 'Art' }],
  'viajes':          [{ levelKey: 'Aprendiz', topicLabel: 'Travel' }, { levelKey: 'Explorador', topicLabel: 'Culture' }],
  'emprendimiento':  [{ levelKey: 'Explorador', topicLabel: 'Economics' }, { levelKey: 'Explorador', topicLabel: 'Future' }],
  'literatura':      [{ levelKey: 'Explorador', topicLabel: 'Stories' }, { levelKey: 'Explorador', topicLabel: 'Art' }],
  'idiomas':         [{ levelKey: 'Explorador', topicLabel: 'Culture' }, { levelKey: 'Aprendiz', topicLabel: 'Travel' }],
  'negocios':        [{ levelKey: 'Explorador', topicLabel: 'Economics' }, { levelKey: 'Explorador', topicLabel: 'Future' }],
  'entretenimiento': [{ levelKey: 'Aprendiz', topicLabel: 'Movies' }, { levelKey: 'Aprendiz', topicLabel: 'Music' }],
  'naturaleza':      [{ levelKey: 'Explorador', topicLabel: 'Environment' }, { levelKey: 'Aprendiz', topicLabel: 'Nature' }],
};

function getTopicsForInterest(interest: string) {
  const key = interest.toLowerCase().trim();
  if (INTEREST_TOPIC_MAP[key]) return INTEREST_TOPIC_MAP[key];
  for (const [mapKey, topics] of Object.entries(INTEREST_TOPIC_MAP)) {
    if (key.includes(mapKey) || mapKey.includes(key)) return topics;
  }
  return [{ levelKey: 'Explorador' as EnglishLevelKey, topicLabel: 'Debate' }];
}

function resolveTopics(refs: { levelKey: EnglishLevelKey; topicLabel: string }[]) {
  return refs.map(ref => {
    const level = ENGLISH_LEVELS.find(l => l.key === ref.levelKey);
    const topic = level?.topics.find(t => t.label === ref.topicLabel);
    if (!level || !topic) return null;
    return { level, topic };
  }).filter((x): x is { level: EnglishLevelDef; topic: { emoji: string; label: string; starter: string } } => x !== null);
}

const IDIOMAS_CATEGORIES = [
  { emoji: '💻', label: 'Tecnología',     starter: 'Hablemos en inglés sobre tecnología e innovación',        levelKey: 'Explorador' as EnglishLevelKey, g1: '#002a1e', g2: '#003d29', border: 'rgba(0,225,171,0.25)' },
  { emoji: '✈️',  label: 'Viajes',         starter: 'Practiquemos inglés para viajes y turismo internacional',  levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#001a3a', g2: '#00254f', border: 'rgba(76,214,255,0.25)' },
  { emoji: '💼', label: 'Negocios',       starter: 'Practiquemos inglés profesional para negocios y trabajo',  levelKey: 'Explorador' as EnglishLevelKey, g1: '#1a0a38', g2: '#25105a', border: 'rgba(167,139,250,0.25)' },
  { emoji: '🔬', label: 'Ciencia',        starter: 'Hablemos en inglés sobre descubrimientos y ciencia',       levelKey: 'Explorador' as EnglishLevelKey, g1: '#00211a', g2: '#002e22', border: 'rgba(0,225,171,0.2)'  },
  { emoji: '🎬', label: 'Cine & Series',  starter: 'Hablemos en inglés sobre películas y series populares',    levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#2a0808', g2: '#380c0c', border: 'rgba(251,146,60,0.25)' },
  { emoji: '⚽', label: 'Deportes',       starter: 'Conversemos en inglés sobre deportes y competencias',      levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#1e1000', g2: '#2c1800', border: 'rgba(251,191,36,0.25)' },
  { emoji: '🎨', label: 'Arte & Cultura', starter: 'Exploremos arte, música y cultura en inglés',             levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#1e0a2e', g2: '#2a1040', border: 'rgba(192,132,252,0.25)' },
  { emoji: '🌿', label: 'Naturaleza',     starter: 'Discutamos en inglés sobre medio ambiente y naturaleza',   levelKey: 'Explorador' as EnglishLevelKey, g1: '#061808', g2: '#0a2810', border: 'rgba(74,222,128,0.25)' },
  { emoji: '🏥', label: 'Salud',          starter: 'Practiquemos inglés relacionado con salud y bienestar',    levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#001820', g2: '#002030', border: 'rgba(125,211,252,0.25)' },
  { emoji: '🎓', label: 'Educación',      starter: 'Hablemos en inglés sobre educación y aprendizaje',         levelKey: 'Explorador' as EnglishLevelKey, g1: '#0a0a20', g2: '#10103a', border: 'rgba(99,102,241,0.25)' },
  { emoji: '🍕', label: 'Gastronomía',    starter: 'Conversemos en inglés sobre comida y gastronomía mundial', levelKey: 'Aprendiz'   as EnglishLevelKey, g1: '#1e0e00', g2: '#2c1800', border: 'rgba(251,191,36,0.2)'  },
  { emoji: '🤖', label: 'Inteligencia Artificial', starter: 'Hablemos en inglés sobre IA y el futuro digital',levelKey: 'Explorador' as EnglishLevelKey, g1: '#001828', g2: '#002038', border: 'rgba(56,189,248,0.25)' },
] as const;

const DISCOVERY_ROUTES = [
  { id: 'ciencia',  emoji: '⚗️', color: '#00e1ab', title: 'Ciencia Viral',   desc: 'Experimentos y descubrimientos que están cambiando el mundo hoy.',          tag: 'NUEVOS',      prompt: 'Cuéntame los descubrimientos científicos más impactantes del momento' },
  { id: 'cosmos',   emoji: '🌌', color: '#a78bfa', title: 'Cosmos Pro',      desc: 'Viaja a las estrellas, conoce planetas y misterios del universo profundo.', tag: 'TENDENCIA',   prompt: 'Explícame los misterios más fascinantes del universo y el cosmos' },
  { id: 'historia', emoji: '🏛️', color: '#fbbf24', title: 'Pasado Épico',    desc: 'Civilizaciones perdidas y héroes que forjaron nuestra realidad actual.',   tag: 'INTERACTIVO', prompt: 'Cuéntame sobre civilizaciones antiguas perdidas y su impacto en el mundo moderno' },
  { id: 'tech',     emoji: '🤖', color: '#4cd6ff', title: 'Código & Futuro', desc: 'IA, robots y la tecnología de vanguardia que definirá el mañana.',          tag: 'EN VIVO',     prompt: 'Explícame cómo la inteligencia artificial está transformando el mundo y el futuro' },
];

const FEATURED_SUGGESTION = {
  title: '¿Podremos vivir en Marte?',
  desc: 'Descubre los desafíos tecnológicos y biológicos de colonizar el Planeta Rojo en la próxima década.',
  prompt: '¿Podremos vivir en Marte? Explícame los desafíos tecnológicos, biológicos y de ingeniería para colonizar el Planeta Rojo',
};

const PERSP_ICONS: Record<number, typeof Search> = {
  0: Search,
  1: Zap,
  2: Lightbulb,
};

const OPTION_COLORS = ["#00D4AA", "#FF9500", "#6C63FF"];
const OPTION_DEFS = [
  { letter: "A", question: "¿Qué dice la evidencia?",  hint: "Datos y análisis objetivo", badge: "ANALÍTICA" },
  { letter: "B", question: "¿Qué debemos cuestionar?", hint: "Perspectiva crítica",        badge: "CRÍTICA"   },
  { letter: "C", question: "¿Cómo lo aplico?",         hint: "Aplicación práctica",        badge: "PRÁCTICA"  },
];

function PerspectivesView({
  msg,
  copied,
  onCopy,
  onResend,
  loading,
  onStop,
  isTtsFetching = false,
  isTtsPlaying = false,
  onSpeak,
  onStopSpeaking,
}: {
  msg: UiMessage;
  copied: boolean;
  onCopy: (message: UiMessage) => void;
  onResend: (question: string) => void;
  loading: boolean;
  onStop: () => void;
  isTtsFetching?: boolean;
  isTtsPlaying?: boolean;
  onSpeak?: () => void;
  onStopSpeaking?: () => void;
}) {
  return (
    <div className="persp-container">
      {/* Header row */}
      <div className="persp-header">
        <img src={acoreaiIdea} alt="" className="persp-avatar" />
        <div className="persp-header-text">
          <strong>ACoreAI · Análisis Crítico</strong>
          <span className="persp-sub">{timeLabel(msg.createdAt)}</span>
        </div>
        {msg.streaming && (
          <span className="typing-dots" style={{ marginLeft: "auto" }}><i /><i /><i /></span>
        )}
      </div>

      {/* 3-column perspective cards */}
      <div className="persp-cards">
        {OPTION_DEFS.map((def, idx) => {
          const color = OPTION_COLORS[idx];
          const pData = msg.perspectives?.[idx];
          const isStreaming = msg.streaming && msg.activePerspIdx === idx;
          const hasData = !!pData && pData.text.length > 0;
          const isPending = !hasData && (msg.streaming ?? false);
          const categoryLabel = pData?.label ?? def.badge;

          return (
            <div
              key={idx}
              className={`persp-card${isPending ? " persp-pending" : ""}${hasData ? " persp-card--has-data" : ""}`}
              style={{ "--pc": color } as React.CSSProperties}
            >
              {/* Card header */}
              <div className="persp-card-header">
                <span className="persp-option-badge" style={{ background: `${color}1a`, border: `1.5px solid ${color}50`, color }}>
                  {def.letter}
                </span>
                <div className="persp-card-label-group">
                  <span className="persp-card-question" style={{ color }}>{def.question}</span>
                  <span className="persp-card-hint">{def.hint}</span>
                </div>
                <span className="persp-cat-badge" style={{ color, borderColor: `${color}40`, background: `${color}12` }}>
                  {categoryLabel}
                </span>
                {isStreaming && <span className="typing-dots" style={{ position: "absolute", bottom: 10, right: 12 }}><i /><i /><i /></span>}
              </div>

              {/* Card body — always visible */}
              <div className="persp-card-body">
                {hasData ? (
                  <>
                    <Markdown content={pData.text} streaming={isStreaming ?? false} />
                    {((pData.sources as PerspectiveSource[] | undefined) ?? msg.sources ?? []).length > 0 && (
                      <div className="persp-sources persp-sources-inline">
                        <div className="persp-sources-header">
                          <BookmarkCheck size={11} />
                          <span>Referencias</span>
                        </div>
                        {((pData.sources as PerspectiveSource[] | undefined) ?? msg.sources ?? []).map((s, i) => (
                          <div key={`${s.chunkId ?? s.documentId}-${i}`} className="persp-source-item">
                            <span className="persp-source-dot" />
                            {s.sourceUrl ? (
                              <a href={s.sourceUrl} target="_blank" rel="noopener noreferrer" className="persp-source-link">
                                {s.title || s.documentId}
                              </a>
                            ) : (
                              <span className="persp-source-name">{s.title || s.documentId}</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : isPending ? (
                  <div className="persp-body-pending">
                    <Loader2 size={15} className="tts-spinner" />
                    <span>Generando perspectiva...</span>
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>

      {/* Compara y Cuestiona section */}
      {!msg.streaming && (
        <div className="persp-compare">
          <img src={acoreaiIdea} alt="" className="persp-compare-avatar" />
          <div className="persp-compare-body">
            <p className="persp-compare-title">"Compara y Cuestiona"</p>
            <p className="persp-compare-sub">Ninguna respuesta es absoluta. Analiza los puntos en común y las contradicciones entre estas perspectivas para construir tu propio criterio.</p>
            <div className="persp-compare-actions">
              <button className="persp-act-btn" onClick={() => onCopy(msg)}>
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copiado" : "Copiar análisis"}
              </button>
              <button
                className={`persp-act-btn${isTtsPlaying || isTtsFetching ? " active" : ""}`}
                onClick={() => (isTtsPlaying || isTtsFetching) ? onStopSpeaking?.() : onSpeak?.()}
                disabled={isTtsFetching}
              >
                {isTtsFetching ? <Loader2 size={13} className="tts-spinner" /> : isTtsPlaying ? <VolumeX size={13} /> : <Volume2 size={13} />}
                {isTtsFetching ? "Cargando..." : isTtsPlaying ? "Detener" : "Escuchar"}
              </button>
              {msg.question ? (
                <button className="persp-act-btn" onClick={() => loading ? onStop() : onResend(msg.question ?? "")}>
                  {loading ? <Square size={13} /> : <RotateCcw size={13} />}
                  {loading ? "Detener" : "Re-analizar"}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function nowIso() {
  return new Date().toISOString();
}

function timeLabel(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function titleFromMessage(content: string) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > 46
    ? `${clean.slice(0, 46)}...`
    : clean || "Nueva conversacion";
}

function perspectiveText(message: UiMessage): string {
  if (message.kind !== "perspectives") return message.content;
  return (message.perspectives ?? [])
    .map((p, index) => `${index + 1}. ${p.label}\n${p.text}`)
    .filter((entry) => entry.trim().length > 3)
    .join("\n\n");
}

function userInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");
}

function mapServerMessage(message: ChatMessage): UiMessage {
  // Detect saved perspectives format: [Label]\ntext\n\n---\n\n[Label]\ntext ...
  if (message.role === 'assistant' && message.content.includes('\n\n---\n\n')) {
    const sections = message.content.split('\n\n---\n\n');
    const labelRe = /^\[([^\]]+)\]\n([\s\S]*)$/s;
    if (sections.length >= 2 && sections.every((s) => labelRe.test(s))) {
      const perspectives: PerspectiveMeta[] = sections.map((section, i) => {
        const m = section.match(labelRe);
        return {
          index: i,
          key: m?.[1] ?? `perspective_${i}`,
          label: m?.[1] ?? `Perspectiva ${i + 1}`,
          icon: '',
          color: OPTION_COLORS[i] ?? '#00D4AA',
          text: m?.[2]?.trim() ?? section,
        };
      });
      return {
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt || nowIso(),
        kind: 'perspectives',
        perspectives,
        sources: [],
      };
    }
  }
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt || nowIso(),
  };
}

export function UserApp() {
  const [user, setUser] = useState<DemoUser | null>(() => readStoredUser());
  const [aiProfile, setAiProfile] = useState<UserAiProfile | null>(() => {
    const stored = readStoredUser();
    return stored ? loadProfile(stored.id) : null;
  });
  const [editingProfile, setEditingProfile] = useState(false);
  const [theme, setTheme] = useState<ThemeKey>(() => {
    return (
      (window.localStorage.getItem("acoreai-web:theme") as ThemeKey | null) ||
      "light"
    );
  });
  const [tab, setTab] = useState<TabKey>(() => {
    const stored = readStoredUser();
    if (!stored) return 'chat';
    const p = loadProfile(stored.id);
    return p?.onboardingCompleted && p.preferredMode === 'languages' ? 'translate' : 'chat';
  });
  const [mode, setMode] = useState<ModeKey>("fast");
  const [modePickerOpen, setModePickerOpen] = useState(false);
  const modePickerRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [idiomasTab, setIdiomasTab] = useState<'home' | 'practicar' | 'traducir'>(() => {
    const stored = readStoredUser();
    if (!stored) return 'home';
    const p = loadProfile(stored.id);
    return p?.onboardingCompleted ? 'home' : 'home';
  });
  const [practiceAutoTopic, setPracticeAutoTopic] = useState<{ starter: string; levelKey: EnglishLevelKey } | null>(null);
  const [idiomasShowAll, setIdiomasShowAll] = useState(false);
  const [homeSelectedLevelIdx, setHomeSelectedLevelIdx] = useState(0);
  const [histTab, setHistTab] = useState<'investigacion' | 'idiomas'>(() => {
    const stored = readStoredUser();
    if (!stored) return 'investigacion';
    const p = loadProfile(stored.id);
    return p?.onboardingCompleted && p.preferredMode === 'languages' ? 'idiomas' : 'investigacion';
  });
  const [chatMode, setChatMode] = useState<'general' | 'perspectivas' | 'rag'>('general');
  const [savedTranslations, setSavedTranslations] = useState<SavedTranslation[]>([]);
  const [pracicarConversations, setPracicarConversations] = useState<Conversation[]>([]);
  const [translSaved, setTranslSaved] = useState(false);
  const [resumePracticeId, setResumePracticeId] = useState<string | null>(null);
  const [resumePracticeLevel, setResumePracticeLevel] = useState<string | null>(null);
  const [health, setHealth] = useState<"online" | "offline" | "checking">(
    "checking",
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [translateInput, setTranslateInput] = useState("");
  const [translateSourceLang, setTranslateSourceLang] = useState("ingles");
  const [translateLangs, setTranslateLangs] = useState<string[]>(["espanol"]);
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translateLoading, setTranslateLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [sttLoading, setSttLoading] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const sttAbortRef = useRef<AbortController | null>(null);

  const [ttsMessageId, setTtsMessageId] = useState<string | null>(null);
  const [ttsWords, setTtsWords] = useState<string[]>([]);
  const [ttsWordIdx, setTtsWordIdx] = useState(0);
  const [ttsFetching, setTtsFetching] = useState(false);
  const [ttsError, setTtsError] = useState<string | null>(null);

  const abortRef    = useRef<AbortController | null>(null);
  const scrollRef      = useRef<HTMLDivElement | null>(null);
  const appShellRef    = useRef<HTMLElement | null>(null);
  const chatInputRef   = useRef<HTMLTextAreaElement | null>(null);
  const wpSearchInputRef = useRef<HTMLInputElement | null>(null);
  const carouselRef = useRef<HTMLDivElement | null>(null);
  const carouselDrag = useRef({ active: false, startX: 0, scrollLeft: 0 });
  const [carouselScrolled, setCarouselScrolled] = useState(false);
  const [globeSpinning, setGlobeSpinning] = useState(false);
  const [dailySuggestion, setDailySuggestion] = useState<DailySuggestion | null>(null);
  const [suggestionLoading, setSuggestionLoading] = useState(false);
  const [welcomeTab, setWelcomeTab] = useState<'routes' | 'suggestion'>('routes');
  const audioCtxRef = useRef<{
    source: AudioBufferSourceNode;
    ctx: AudioContext;
  } | null>(null);
  const rafRef = useRef<number>(0);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const [playingTranslLang, setPlayingTranslLang] = useState<string | null>(
    null,
  );
  const [fetchingTranslLang, setFetchingTranslLang] = useState<string | null>(
    null,
  );
  const translAudioRef = useRef<{
    source: AudioBufferSourceNode;
    ctx: AudioContext;
  } | null>(null);
  const translAbortRef = useRef<AbortController | null>(null);

  // Infraestructura para modo conversación continua con voz (activar con voiceConversationRef.current = true)
  const voiceConversationRef = useRef(false);

  const currentMode = MODES[mode];

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("acoreai-web:theme", theme);
  }, [theme]);

  useEffect(() => {
    setHistTab(tab === 'translate' ? 'idiomas' : 'investigacion');
  }, [tab]);

  useEffect(() => {
    if (!user || !aiProfile) return;
    const CACHE_KEY = `acoreai-web:daily-suggestion:${user.id}`;
    const today = new Date().toISOString().slice(0, 10);
    try {
      const cached = JSON.parse(window.localStorage.getItem(CACHE_KEY) ?? 'null') as (DailySuggestion & { date: string }) | null;
      if (cached && cached.date === today) {
        setDailySuggestion({ title: cached.title, desc: cached.desc, prompt: cached.prompt });
        return;
      }
    } catch { /* ignore */ }

    const ctrl = new AbortController();
    setSuggestionLoading(true);
    const topics = aiProfile.interestTopics.length > 0 ? aiProfile.interestTopics : [];
    generateDailySuggestion(user.id, user.token, topics, ctrl.signal)
      .then(suggestion => {
        if (!suggestion) return;
        setDailySuggestion(suggestion);
        window.localStorage.setItem(CACHE_KEY, JSON.stringify({ ...suggestion, date: today }));
      })
      .catch(() => { /* silently fall back to default */ })
      .finally(() => setSuggestionLoading(false));
    return () => ctrl.abort();
  }, [user?.id, aiProfile?.interestTopics.join(',')]);

  useEffect(() => {
    const shell = appShellRef.current;
    if (!shell) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0, lx = -9999, ly = -9999;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (dx * dx + dy * dy < 25) return;
      lx = e.clientX; ly = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        shell.style.setProperty("--mx", lx + "px");
        shell.style.setProperty("--my", ly + "px");
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const refreshConversations = useCallback(async () => {
    if (!user) return;
    try {
      const [investigacion, practica] = await Promise.all([
        listConversations(user.id, user.token),
        listConversationsBySourcePrefix(user.id, 'acoreai-practice-', user.token),
      ]);
      setConversations(investigacion);
      setPracicarConversations(practica);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStoredUser();
        setUser(null);
        return;
      }
      setConversations([]);
    }
  }, [user]);

  const refreshTranslationHistory = useCallback(async () => {
    if (!user) return;
    try {
      const items = await listTranslationHistory(user.id, user.token);
      setSavedTranslations(items);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStoredUser();
        setUser(null);
        return;
      }
      setSavedTranslations([]);
    }
  }, [user]);

  async function handleSaveTranslation() {
    if (!user || !translateInput.trim() || Object.keys(translations).length === 0) return;
    try {
      const entry = await saveTranslationToServer({
        title: translateInput.slice(0, 48) + (translateInput.length > 48 ? '…' : ''),
        text: translateInput,
        translations,
        langs: translateLangs,
      }, user.token);
      setSavedTranslations(prev => [entry, ...prev]);
      setTranslSaved(true);
      window.setTimeout(() => setTranslSaved(false), 2000);
    } catch {
    }
  }

  async function handleDeleteSavedTranslation(id: string) {
    if (!user) return;
    setSavedTranslations(prev => prev.filter(t => t.id !== id));
    try {
      await deleteTranslationFromServer(id, user.token);
    } catch {
    }
  }

  function loadSavedTranslation(entry: SavedTranslation) {
    setTranslateInput(entry.text);
    setTranslations(entry.translations);
    setTranslateLangs(entry.langs);
    setTab('translate');
    setIdiomasTab('traducir');
    setDrawerOpen(false);
  }

  function loadPracticeConversation(convId: string, level: string | undefined) {
    setResumePracticeId(convId);
    setResumePracticeLevel(level ?? null);
    setTab('translate');
    setIdiomasTab('practicar');
    setDrawerOpen(false);
  }

  useEffect(() => {
    if (!user) return;
    fetchHealth()
      .then(() => setHealth("online"))
      .catch(() => setHealth("offline"));
    refreshConversations();
    refreshTranslationHistory();
    fetchAndCacheProfile(user.id, user.token)
      .then(profile => { if (profile) setAiProfile(profile); })
      .catch(() => undefined);
  }, [refreshConversations, refreshTranslationHistory, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (!modePickerOpen) return;
    function handleClickOutside(e: PointerEvent) {
      if (modePickerRef.current && !modePickerRef.current.contains(e.target as Node)) {
        setModePickerOpen(false);
      }
    }
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, [modePickerOpen]);

  const welcomeVisible = messages.length === 0;

  function handleNameChange(name: string) {
    if (!user) return;
    const updated = { ...user, name };
    setUser(updated);
    storeUser(updated);
  }

  function handleLogin(nextUser: DemoUser) {
    setUser(nextUser);
    setAiProfile(loadProfile(nextUser.id));
  }

  function logout() {
    abortRef.current?.abort();
    clearStoredUser();
    clearProfile();
    setUser(null);
    setAiProfile(null);
    setEditingProfile(false);
    setMessages([]);
    setConversationId(null);
  }

  // Escuchar expiración de sesión disparada desde gateway.ts
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener('acoreai:session-expired', handler);
    return () => window.removeEventListener('acoreai:session-expired', handler);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function newChat() {
    abortRef.current?.abort();
    stopSpeaking();
    setConversationId(null);
    setMessages([]);
    setInput("");
    setTab("chat");
  }

  function stopGeneration() {
    abortRef.current?.abort();
  }

  async function loadConversation(conversation: Conversation) {
    if (!user) return;
    abortRef.current?.abort();
    stopSpeaking();
    // Limpia el estado inmediatamente antes de cargar
    setConversationId(conversation.id);
    setMessages([]);
    setTab("chat");
    setDrawerOpen(false);
    setLoading(true);
    try {
      const items = await getConversationMessages(conversation.id, user.id, user.token);
      if (items.length === 0) {
        setMessages([]);
      } else {
        setMessages(items.map(mapServerMessage));
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        clearStoredUser();
        setUser(null);
        return;
      }
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }

  async function removeConversation(conversation: Conversation) {
    if (!user) return;
    await deleteConversation(conversation.id, user.id, user.token);
    if (conversation.id === conversationId) newChat();
    await refreshConversations();
  }

  async function sendMessage(
    event?: FormEvent,
    opts?: { question?: string; autoSpeak?: boolean },
  ) {
    event?.preventDefault();
    if (!user || loading) return;
    const question = opts?.question ?? input.trim();
    if (!question) return;

    const controller = new AbortController();
    abortRef.current = controller;
    const userMessage: UiMessage = {
      id: safeRandomUUID(),
      role: "user",
      content: question,
      createdAt: nowIso(),
    };
    const assistantId = safeRandomUUID();
    // Solo limpiar el input si la pregunta vino del campo de texto
    if (!opts?.question) setInput("");
    setLoading(true);

    if (chatMode === "general") {
      const assistantMessage: UiMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: nowIso(),
        streaming: true,
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      try {
        const result = await streamChat(
          { question, model: currentMode.model, userId: user.id, authToken: user.token, conversationId },
          (token) => {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantId ? { ...msg, content: msg.content + token } : msg,
              ),
            );
          },
          controller.signal,
        );
        const newConvId = result.conversationId || conversationId;
        setConversationId(newConvId);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: result.answer || msg.content, streaming: false } : msg,
          ),
        );
        await refreshConversations();
        if (opts?.autoSpeak && result.answer) {
          window.setTimeout(() => {
            speakMessage({ id: assistantId, role: "assistant", content: result.answer, createdAt: nowIso() });
          }, 120);
        }
      } catch (error) {
        if ((error as Error).name === "AbortError") { setLoading(false); return; }
        const errorMessage = error instanceof Error && error.message.trim()
          ? error.message
          : "No pude conectar con acoreai-gateway.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: errorMessage, streaming: false, error: true } : msg,
          ),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    if (chatMode === "rag") {
      const assistantMessage: UiMessage = {
        id: assistantId,
        role: "assistant",
        content: "",
        createdAt: nowIso(),
        streaming: true,
        kind: "rag",
      };
      setMessages((prev) => [...prev, userMessage, assistantMessage]);
      try {
        const result = await askRag({ message: question, model: currentMode.model, authToken: user.token });
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId
              ? { ...msg, content: result.answer, streaming: false, ragSources: result.sources, ragUsedKnowledge: result.usedKnowledge }
              : msg,
          ),
        );
      } catch (error) {
        const errorMessage = error instanceof Error && error.message.trim()
          ? error.message
          : "No pude conectar con el Centro de Conocimiento.";
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantId ? { ...msg, content: errorMessage, streaming: false, error: true } : msg,
          ),
        );
      } finally {
        setLoading(false);
      }
      return;
    }

    const assistantMessage: UiMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      createdAt: nowIso(),
      streaming: true,
      kind: "perspectives",
      question,
      perspectives: [],
      sources: [],
    };
    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const perspResult = await streamPerspectives(
        {
          question,
          model: currentMode.model,
          userId: user.id,
          authToken: user.token,
          conversationId,
        },
        {
          onPerspectiveStart: (idx, meta) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantId) return msg;
                const newPerspective: PerspectiveMeta = {
                  index: idx,
                  key: meta.label,
                  label: meta.label,
                  icon: meta.icon,
                  color: meta.color,
                  text: "",
                };
                return {
                  ...msg,
                  activePerspIdx: idx,
                  perspectives: [...(msg.perspectives ?? []), newPerspective],
                };
              }),
            );
          },
          onPerspectiveToken: (idx, token) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantId) return msg;
                const perspectives = (msg.perspectives ?? []).map((p, i) =>
                  i === idx ? { ...p, text: p.text + token } : p,
                );
                return { ...msg, perspectives };
              }),
            );
          },
          onPerspectiveDone: (idx, text) => {
            setMessages((prev) =>
              prev.map((msg) => {
                if (msg.id !== assistantId) return msg;
                const perspectives = (msg.perspectives ?? []).map((p, i) =>
                  i === idx ? { ...p, text } : p,
                );
                return { ...msg, perspectives };
              }),
            );
          },
        },
        controller.signal,
      );

      const newConvId = perspResult.conversationId || conversationId;
      setConversationId(newConvId);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                streaming: false,
                activePerspIdx: undefined,
                perspectives: perspResult.perspectives?.length
                  ? perspResult.perspectives
                  : msg.perspectives,
                sources: perspResult.sources,
              }
            : msg,
        ),
      );
      await refreshConversations();

      const allText = (perspResult.perspectives ?? []).map((p) => p.text).join(" ");
      // Si la consulta vino por voz, reproducir la respuesta automáticamente
      if (opts?.autoSpeak && allText) {
        window.setTimeout(() => {
          speakMessage({
            id: assistantId,
            role: "assistant",
            content: allText,
            createdAt: nowIso(),
          });
        }, 120);
      }
    } catch (error) {
      if ((error as Error).name === "AbortError") return;
      const errorMessage =
        error instanceof Error && error.message.trim()
          ? error.message
          : "No pude conectar con acoreai-gateway. Revisa el .env, el proxy de Vite o que el gateway este activo.";
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantId
            ? {
              ...msg,
              content: errorMessage,
              streaming: false,
              error: true,
            }
            : msg,
        ),
      );
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  }

  function stopTranslationAudio() {
    translAbortRef.current?.abort();
    translAbortRef.current = null;
    if (translAudioRef.current) {
      try {
        translAudioRef.current.source.stop();
      } catch {
      }
      translAudioRef.current.ctx.close();
      translAudioRef.current = null;
    }
    setPlayingTranslLang(null);
    setFetchingTranslLang(null);
  }

  function cleanTextForTts(raw: string): string {
    return raw
      .replace(/#{1,6}\s*/gm, '')
      .replace(/(\*\*|__)(.*?)\1/gs, '$2')
      .replace(/(\*|_)(.*?)\1/gs, '$2')
      .replace(/`{1,3}[^`]*`{1,3}/g, '')
      .replace(/^\s*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/[#@^|~\\[\]{}]/g, '')
      .replace(/\/+/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  async function speakTranslation(lang: string, text: string) {
    stopTranslationAudio();
    stopSpeaking();

    const voice =
      LANGUAGES.find((l) => l.key === lang)?.voice ?? "edge:es-CO-SalomeNeural";

    const controller = new AbortController();
    translAbortRef.current = controller;
    setFetchingTranslLang(lang);

    try {
      const buf = await synthesizeSpeech(cleanTextForTts(text), voice, 1.0, controller.signal);
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(buf);
      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.start();

      translAudioRef.current = { source, ctx };
      setFetchingTranslLang(null);
      setPlayingTranslLang(lang);

      source.onended = () => {
        setPlayingTranslLang(null);
        translAudioRef.current = null;
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setFetchingTranslLang(null);
      setTtsError("No se pudo reproducir el audio del idioma.");
      window.setTimeout(() => setTtsError(null), 4000);
    }
  }

  function stopSpeaking() {
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    cancelAnimationFrame(rafRef.current);
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.source.stop();
      } catch {
      }
      audioCtxRef.current.ctx.close();
      audioCtxRef.current = null;
    }
    setTtsMessageId(null);
    setTtsFetching(false);
    setTtsWords([]);
    setTtsWordIdx(0);
  }

  async function speakMessage(message: UiMessage) {
    // Abortar cualquier audio en curso y empezar limpio
    stopSpeaking();

    const controller = new AbortController();
    ttsAbortRef.current = controller;
    setTtsFetching(true);
    setTtsMessageId(message.id);

    try {
      const rawText = message.kind === "perspectives"
        ? perspectiveText(message)
        : message.content;
      const cleanText = stripMarkdown(rawText);
      const arrayBuffer = await synthesizeSpeech(
        cleanText,
        "ef_dora",
        1.0,
        controller.signal,
      );
      const ctx = new AudioContext();
      const decoded = await ctx.decodeAudioData(arrayBuffer);
      const duration = decoded.duration;
      const words = cleanText.match(/\S+/g) ?? [];

      const source = ctx.createBufferSource();
      source.buffer = decoded;
      source.connect(ctx.destination);
      source.start();

      audioCtxRef.current = { source, ctx };
      setTtsWords(words);
      setTtsWordIdx(0);
      setTtsFetching(false);

      const startedAt = ctx.currentTime;

      function tick() {
        const progress = Math.min(
          ((ctx.currentTime - startedAt) / duration) * 1.05,
          1,
        );
        setTtsWordIdx(
          Math.min(Math.floor(progress * words.length), words.length - 1),
        );
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      }
      rafRef.current = requestAnimationFrame(tick);

      source.onended = () => {
        cancelAnimationFrame(rafRef.current);
        setTtsMessageId(null);
        setTtsWords([]);
        setTtsWordIdx(0);
        audioCtxRef.current = null;
        // Modo conversación continua: cuando esté activo, escucha automáticamente la siguiente pregunta
        if (voiceConversationRef.current) {
          window.setTimeout(() => startRecording(), 600);
        }
      };
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setTtsFetching(false);
      setTtsMessageId(null);
      setTtsError(
        "No se pudo cargar el audio. Verifica que el servicio TTS esté activo.",
      );
      window.setTimeout(() => setTtsError(null), 4000);
    }
  }

  async function startRecording(opts?: {
    onTranscribed?: (text: string) => void;
    language?: string;
  }) {
    if (recording || sttLoading) return;
    const lang = opts?.language ?? "es";
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Buscar el primer MIME type soportado por este browser
      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/ogg;codecs=opus",
          "audio/mp4",
        ].find((t) => MediaRecorder.isTypeSupported(t)) ?? "";

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);

      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });

        if (blob.size < 100) {
          setTtsError("Grabación demasiado corta, intenta de nuevo.");
          window.setTimeout(() => setTtsError(null), 3000);
          return;
        }

        const controller = new AbortController();
        sttAbortRef.current = controller;
        setSttLoading(true);

        try {
          const text = await transcribeAudio(blob, lang, controller.signal);
          const trimmed = text.trim();
          if (trimmed) {
            if (opts?.onTranscribed) {
              opts.onTranscribed(trimmed);
            } else {
              sendMessage(undefined, { question: trimmed });
            }
          } else {
            setTtsError("No se detectó voz. Habla más cerca del micrófono.");
            window.setTimeout(() => setTtsError(null), 3500);
          }
        } catch (err) {
          if ((err as Error).name === "AbortError") return;
          setTtsError(
            "Error al transcribir. Verifica que el servicio STT esté activo.",
          );
          window.setTimeout(() => setTtsError(null), 5000);
        } finally {
          setSttLoading(false);
          sttAbortRef.current = null;
        }
      };

      recorderRef.current = recorder;
      // timeslice de 200ms: garantiza que ondataavailable se dispare en todos los browsers
      recorder.start(200);
      setRecording(true);
    } catch (err) {
      const msg =
        (err as Error).name === "NotAllowedError"
          ? "Permiso de micrófono denegado."
          : "No se pudo acceder al micrófono.";
      setTtsError(msg);
      window.setTimeout(() => setTtsError(null), 4000);
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function copyText(message: UiMessage) {
    await navigator.clipboard.writeText(stripMarkdown(perspectiveText(message)));
    setCopiedId(message.id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  function resendMessage(message: UiMessage) {
    const question = message.content.trim();
    if (!question || loading) return;
    void sendMessage(undefined, { question });
  }

  async function runTranslate(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    if (!translateInput.trim() || translateLangs.length === 0) return;
    setTranslateLoading(true);
    try {
      setTranslations(Object.fromEntries(translateLangs.map((lang) => [lang, ""])));
      await translateTextStream(
        translateInput,
        translateLangs,
        TRANSLATION_MODEL,
        (lang, token) => {
          setTranslations((prev) => ({
            ...prev,
            [lang]: `${prev[lang] || ""}${token}`,
          }));
        },
        (lang, translation) => {
          setTranslations((prev) => ({
            ...prev,
            [lang]: translation,
          }));
        },
        undefined,
        user.token,
      );
    } finally {
      setTranslateLoading(false);
    }
  }

  function toggleLanguage(iso: string) {
    setTranslateLangs((prev) => (prev.includes(iso) ? [] : [iso]));
  }

  const syntheticConversations = useMemo(() => {
    if (conversations.length > 0) return conversations;
    if (messages.length === 0) return [];
    const first = messages.find((message) => message.role === "user");
    return [
      {
        id: conversationId || "local",
        title: titleFromMessage(first?.content || "Conversacion local"),
        updatedAt: nowIso(),
      },
    ];
  }, [conversationId, conversations, messages]);

  const investigacionConversations = useMemo(() =>
    syntheticConversations.filter(c =>
      !c.source || (!c.source.startsWith('acoreai-practice-') && c.source !== 'acoreai-voice-practice'),
    ),
  [syntheticConversations]);

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!aiProfile?.onboardingCompleted || editingProfile) {
    return (
      <AiOnboardingWizard
        userId={user.id}
        userName={user.name}
        onComplete={async (data) => {
          const fn = editingProfile ? updateProfileWithApi : completeOnboardingWithApi;
          const profile = await fn(user.id, data, user.token);
          setAiProfile(profile);
          setEditingProfile(false);
          if (profile.preferredMode === 'languages') {
            setTab('translate');
            setIdiomasTab('home');
            setHistTab('idiomas');
          } else {
            setTab('chat');
            setHistTab('investigacion');
          }
        }}
      />
    );
  }

  return (
    <main
      className={`app-shell${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}
      ref={appShellRef}
      data-mode={aiProfile?.preferredMode ?? 'explore'}
    >
      <div className="app-bg" />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        user={user}
        theme={theme}
        onThemeChange={setTheme}
        onNameChange={handleNameChange}
        onLogout={logout}
        chatMode={chatMode}
        onChatModeChange={setChatMode}
      />


      {drawerOpen && (
        <div className="sidebar-overlay" onClick={() => setDrawerOpen(false)} />
      )}

      <aside className={`sidebar ${drawerOpen ? "open" : ""}`}>

        {tab === 'chat' ? (
          <>
            <div className="sidebar-new-chat-wrap">
              <button className="new-chat" onClick={newChat}>
                <MessageSquarePlus size={16} />
                Nueva consulta
              </button>
            </div>

            <div className="conversation-list">
              {investigacionConversations.map((conversation) => (
                <button
                  className={`conversation-item ${conversation.id === conversationId ? "active" : ""}`}
                  key={conversation.id}
                  onClick={() =>
                    conversation.id !== "local" && loadConversation(conversation)
                  }
                >
                  <MessageSquare size={14} className="conv-icon" />
                  <div className="conv-text">
                    <span>{conversation.title}</span>
                    <small>
                      {conversation.updatedAt
                        ? new Date(conversation.updatedAt).toLocaleDateString("es-CO")
                        : "Hoy"}
                    </small>
                  </div>
                  {conversation.id !== "local" ? (
                    <span
                      className="delete-conversation"
                      onClick={(event) => {
                        event.stopPropagation();
                        removeConversation(conversation);
                      }}
                      role="button"
                      tabIndex={0}
                    >
                      <Trash2 size={14} />
                    </span>
                  ) : null}
                </button>
              ))}
              {investigacionConversations.length === 0 ? (
                <div className="empty-history">
                  <img src={acoreaiUps} alt="" />
                  <span>Sin conversaciones todavia</span>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="hist-idiomas-scroll">
            <div className="hist-section-label">🎯 Práctica de inglés</div>
            <div className="conversation-list">
              {pracicarConversations.map((conv) => {
                const level = conv.source?.replace('acoreai-practice-', '') ?? 'Principiante';
                return (
                  <button
                    key={conv.id}
                    className="conversation-item conv-item--practicar"
                    onClick={() => loadPracticeConversation(conv.id, level)}
                  >
                    <span className="conv-level-emoji">
                      {level === 'Explorador' ? '🚀' : level === 'Aprendiz' ? '⭐' : '🌱'}
                    </span>
                    <div className="conv-text">
                      <span>{conv.title}</span>
                      <small>{level} · {conv.updatedAt ? new Date(conv.updatedAt).toLocaleDateString("es-CO") : 'Hoy'}</small>
                    </div>
                    <span
                      className="delete-conversation"
                      onClick={(e) => { e.stopPropagation(); removeConversation(conv); }}
                      role="button"
                      tabIndex={0}
                    >
                      <Trash2 size={14} />
                    </span>
                  </button>
                );
              })}
              {pracicarConversations.length === 0 ? (
                <p className="hist-empty-note">Aún no hay sesiones guardadas</p>
              ) : null}
            </div>

            {/* ── Traducciones guardadas ── */}
            <div className="hist-section-label">🔵 Traducciones guardadas</div>
            <div className="conversation-list">
              {savedTranslations.map((t) => (
                <button
                  key={t.id}
                  className="conversation-item conv-item--traducir"
                  onClick={() => loadSavedTranslation(t)}
                >
                  <Languages size={14} className="conv-icon" />
                  <div className="conv-text">
                    <span>{t.title}</span>
                    <small>{new Date(t.createdAt).toLocaleDateString("es-CO")}</small>
                  </div>
                  <span
                    className="delete-conversation"
                    onClick={(e) => { e.stopPropagation(); handleDeleteSavedTranslation(t.id); }}
                    role="button"
                    tabIndex={0}
                  >
                    <Trash2 size={14} />
                  </span>
                </button>
              ))}
              {savedTranslations.length === 0 ? (
                <p className="hist-empty-note">Usa el botón "Guardar" en una traducción</p>
              ) : null}
            </div>
          </div>
        )}

        {tab === 'chat' && (
          <div className="sidebar-mode-switch">
            <span className="sidebar-mode-label">
              <Brain size={13} />
              Modo Explora
            </span>
            <div className="sidebar-mode-toggle">
              <button
                className={chatMode === 'general' ? 'active' : ''}
                onClick={() => setChatMode('general')}
                title="Respuesta directa con explicación y conclusión"
              >
                <MessageSquare size={11} />
                General
              </button>
              <button
                className={chatMode === 'perspectivas' ? 'active' : ''}
                onClick={() => setChatMode('perspectivas')}
                title="Tres enfoques para explorar"
              >
                <Layers size={11} />
                Investigativo
              </button>
              <button
                className={chatMode === 'rag' ? 'active' : ''}
                onClick={() => setChatMode('rag')}
                title="Responde solo con el Centro de Conocimiento (fuentes aprobadas y publicadas)"
              >
                <BookmarkCheck size={11} />
                RAG
              </button>
            </div>
          </div>
        )}
        <div className="sidebar-footer">
          <span>ACoreAI v1.0</span>
        </div>
      </aside>

      <section className={`workspace${voiceOpen ? " workspace--voice" : ""}`}>
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button topbar-panel-toggle"
              onClick={() => { setSidebarCollapsed(v => !v); setDrawerOpen(v => !v); }}
              aria-label="Toggle historial"
            >
              <PanelLeft size={16} />
            </button>

            <div className="topbar-brand">
              <img src={logoAiACoreAI} alt="" className="topbar-brand-img" />
              <div className="topbar-brand-text">
                <span className="topbar-brand-sub">AI LEARNING</span>
                <span className="topbar-brand-name">ACoreAI</span>
              </div>
            </div>

            <span className="topbar-sep" aria-hidden="true" />

            <div className="topbar-breadcrumb">
              {tab === 'translate'
                ? idiomasTab === 'home'       ? <><Languages size={12} /><span>Idiomas</span></>
                : idiomasTab === 'practicar'  ? <><Layers size={12} /><span>Práctica</span></>
                :                               <><Languages size={12} /><span>Traducir</span></>
                : chatMode === 'perspectivas' ? <><Layers size={12} /><span>Investigativo</span></>
                : chatMode === 'rag'          ? <><BookmarkCheck size={12} /><span>RAG</span></>
                :                               <><Search size={12} /><span>Explora</span></>}
            </div>
          </div>

          {/* ── Center: Explora / Idiomas mode switch ── */}
          <div className={`topbar-mode-switch${tab === 'translate' ? ' active-translate' : ' active-chat'}`}>
            <button
              className={`tms-btn${tab === 'chat' ? ' tms-btn--active' : ''}`}
              onClick={() => setTab('chat')}
              title="Modo Explora — IA para investigar y aprender"
            >
              <Search size={14} />
              <span>Explora</span>
            </button>
            <button
              className={`tms-btn${tab === 'translate' ? ' tms-btn--active' : ''}`}
              onClick={() => setTab('translate')}
              title="Modo Idiomas — aprende inglés con IA"
            >
              <Languages size={14} />
              <span>Idiomas</span>
            </button>
          </div>

          <div className="topbar-right">
            {tab === 'translate' ? (
              idiomasTab === 'practicar' ? (
                <div className="topbar-badge topbar-badge--purple">
                  <Layers size={12} /><span>Práctica</span>
                </div>
              ) : idiomasTab === 'traducir' ? (
                <div className="topbar-badge topbar-badge--blue">
                  <Languages size={12} /><span>Traducir</span>
                </div>
              ) : (
                <div className="topbar-badge topbar-badge--teal">
                  <Sparkles size={12} /><span>Para ti</span>
                </div>
              )
            ) : chatMode === 'perspectivas' ? (
              <div className="topbar-badge topbar-badge--purple">
                <Brain size={12} /><span>Investigativo</span>
              </div>
            ) : (
              <div className="topbar-badge topbar-badge--teal">
                <Search size={12} /><span>General</span>
              </div>
            )}
            {loading && (
              <div className="topbar-badge topbar-badge--loading">
                <Loader2 size={12} className="tts-spinner" />
                <span>{messages.length === 0 ? 'Cargando' : 'Generando'}</span>
              </div>
            )}
            <button className="icon-button" onClick={() => setSettingsOpen(true)} title="Configuración">
              <SettingsIcon size={18} />
            </button>
            <div className="topbar-avatar" title={user.name}>
              <div className="avatar-stack">
                {user.photo
                  ? <img src={user.photo} alt={user.name} className="user-photo" />
                  : <span className="user-initials">{userInitials(user.name)}</span>}
                <span className={`status-dot ${health}`} />
              </div>
            </div>
          </div>
        </header>


        {tab === "chat" && voiceOpen ? (
          <VoiceConversation
            open={voiceOpen}
            onClose={() => setVoiceOpen(false)}
            user={user}
            model={SPEECH_PRACTICE_MODEL}
            modelLabel="Speaking"
            conversationId={conversationId}
            onConversationChange={(id) => {
              setConversationId(id);
              refreshConversations();
            }}
          />
        ) : tab === "chat" ? (
          <>
            <section className="chat-panel" ref={scrollRef}>
              {loading && messages.length === 0 ? (
                <div className="conv-loading">
                  <Loader2 size={30} className="conv-loading-spinner" />
                  <span>Cargando conversacion...</span>
                </div>
              ) : welcomeVisible ? (
                <div className="welcome-panel">
                  <div className="wp-bg-grid" />
                  <div className="wp-bg-blob wp-bg-blob--1" />
                  <div className="wp-bg-blob wp-bg-blob--2" />

                  <div className="wp-hero">
                    <div className="wp-acoreai-wrap">
                      <div className="wp-acoreai-ring wp-acoreai-ring--outer" />
                      <div className="wp-acoreai-ring wp-acoreai-ring--inner" />
                      <div className="wp-acoreai-glow" />
                      <img src={acoreaiHola} alt="ACoreAI" className="wp-acoreai" />
                    </div>

                    <div className="wp-headline-block">
                      <h1 className="wp-headline">
                        <span className="wp-hw wp-hw--1">Pregúntale lo que quieras</span>
                      </h1>
                    </div>

                    <form className="wp-search-bar" onSubmit={sendMessage}>
                      <Search size={16} className="wp-search-icon" />
                      <input
                        ref={wpSearchInputRef}
                        className="wp-search-input"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage(); } }}
                        placeholder="¿Por qué el cielo es azul? o ¿Cómo funcionan los agujeros negros?"
                        disabled={loading}
                        autoFocus
                      />
                      <button className="wp-search-submit" type="submit" disabled={!input.trim() || loading}>
                        {loading ? <Loader2 size={15} className="tts-spinner" /> : <><Zap size={14} />Explorar</>}
                      </button>
                    </form>

                    {aiProfile && aiProfile.interestTopics.length > 0 && (
                      <div className="wp-trends">
                        <span className="wp-trends-label">TENDENCIAS</span>
                        {aiProfile.interestTopics.slice(0, 5).map((t, i) => (
                          <button
                            key={t}
                            className="wp-trend-chip"
                            style={{ animationDelay: `${0.5 + i * 0.07}s` }}
                            onClick={() => { setInput(`Explícame ${t} desde una perspectiva académica`); wpSearchInputRef.current?.focus(); }}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="wp-tabs">
                    <button
                      className={`wp-tab${welcomeTab === 'routes' ? ' wp-tab--active' : ''}`}
                      onClick={() => setWelcomeTab('routes')}
                    >
                      <Layers size={13} />
                      Rutas de Descubrimiento
                    </button>
                    <button
                      className={`wp-tab${welcomeTab === 'suggestion' ? ' wp-tab--active' : ''}`}
                      onClick={() => setWelcomeTab('suggestion')}
                    >
                      <Sparkles size={13} />
                      Sugerencia de ACoreAI
                      {suggestionLoading && <span className="wp-tab-dot" />}
                    </button>
                  </div>

                  {welcomeTab === 'routes' ? (
                    <div className="wp-routes">
                      <div className="wp-routes-grid">
                        {DISCOVERY_ROUTES.map((route, i) => (
                          <button
                            key={route.id}
                            className="wp-route-card"
                            style={{ '--card-color': route.color, animationDelay: `${i * 0.07}s` } as React.CSSProperties}
                            onClick={() => { setInput(route.prompt); wpSearchInputRef.current?.focus(); }}
                          >
                            <div className="wp-route-top">
                              <span className="wp-route-emoji" style={{ borderColor: `${route.color}28`, background: `${route.color}12` }}>{route.emoji}</span>
                              <span className="wp-route-tag" style={{ color: route.color }}>{route.tag}</span>
                            </div>
                            <strong className="wp-route-title">{route.title}</strong>
                            <span className="wp-route-desc">{route.desc}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (() => {
                    const suggestion = dailySuggestion ?? FEATURED_SUGGESTION;
                    return (
                      <div className={`wp-featured${suggestionLoading ? ' wp-featured--loading' : ''}`}>
                        <span className="wp-featured-badge">
                          <Sparkles size={11} /> SUGERENCIA DE ACOREAI
                          {suggestionLoading && <span className="wp-featured-generating"> · generando...</span>}
                        </span>
                        {suggestionLoading && !dailySuggestion ? (
                          <div className="wp-featured-body">
                            <div className="wp-skel wp-skel--title" />
                            <div className="wp-skel wp-skel--desc" />
                          </div>
                        ) : (
                          <div className="wp-featured-body">
                            <h2 className="wp-featured-title">{suggestion.title}</h2>
                            <p className="wp-featured-desc">{suggestion.desc}</p>
                          </div>
                        )}
                        <div className="wp-featured-actions">
                          <button
                            className="wp-featured-primary"
                            disabled={suggestionLoading && !dailySuggestion}
                            onClick={() => void sendMessage(undefined, { question: suggestion.prompt })}
                          >
                            Iniciar Investigación
                          </button>
                          <button
                            className="wp-featured-secondary"
                            disabled={suggestionLoading && !dailySuggestion}
                            onClick={() => { setInput(suggestion.prompt); wpSearchInputRef.current?.focus(); }}
                          >
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="message-list">
                  {messages.map((message) => {
                    const isThisTts = ttsMessageId === message.id;
                    const isFetchingThis = ttsFetching && isThisTts;
                    const isPlayingThis = !ttsFetching && isThisTts;

                    if (message.kind === "perspectives") {
                      return (
                        <article className="message assistant" key={message.id}>
                          <PerspectivesView
                            msg={message}
                            copied={copiedId === message.id}
                            onCopy={copyText}
                            onResend={(question) => void sendMessage(undefined, { question })}
                            loading={loading}
                            onStop={stopGeneration}
                            isTtsFetching={ttsFetching && ttsMessageId === message.id}
                            isTtsPlaying={!ttsFetching && ttsMessageId === message.id}
                            onSpeak={() => speakMessage(message)}
                            onStopSpeaking={stopSpeaking}
                          />
                        </article>
                      );
                    }

                    return (
                      <article
                        className={`message ${message.role} ${message.error ? "error" : ""}`}
                        key={message.id}
                      >
                        {message.role === "assistant" ? (
                          <img src={acoreaiIdea} alt="" />
                        ) : null}
                        <div className="bubble">
                          <div className="bubble-meta">
                            <strong>
                              {message.role === "assistant"
                                ? "ACoreAI"
                                : user.name}
                            </strong>
                            <span>{timeLabel(message.createdAt)}</span>
                          </div>

                          {message.role === "assistant" && message.content ? (
                            <Markdown
                              content={message.content}
                              activeWordIdx={
                                isPlayingThis ? ttsWordIdx : undefined
                              }
                              streaming={message.streaming}
                            />
                          ) : (
                            <p>
                              {message.content ||
                                (message.streaming ? "Pensando..." : "")}
                            </p>
                          )}

                          {message.streaming ? (
                            <span className="typing-dots">
                              <i />
                              <i />
                              <i />
                            </span>
                          ) : null}

                          {message.kind === "rag" && !message.streaming && message.ragSources && message.ragSources.length > 0 ? (
                            <div className="persp-sources persp-sources-inline">
                              <div className="persp-sources-header">
                                <BookmarkCheck size={11} />
                                <span>Fuentes aprobadas</span>
                              </div>
                              {message.ragSources.map((s, i) => (
                                <div key={`${s.title}-${i}`} className="persp-source-item">
                                  <span className="persp-source-dot" />
                                  <span className="persp-source-name">
                                    {s.title}
                                    {s.section ? ` — ${s.section}` : ""}
                                    {s.page ? ` (pág. ${s.page})` : ""}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : null}

                          {message.role === "assistant" &&
                            message.content &&
                            !message.streaming ? (
                            <div className="message-actions">
                              <button
                                className="copy-action"
                                onClick={() => copyText(message)}
                              >
                                {copiedId === message.id ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                                {copiedId === message.id ? "Copiado" : "Copiar"}
                              </button>
                              <button
                                className={`tts-action ${isThisTts ? "active" : ""}`}
                                onClick={() =>
                                  isThisTts
                                    ? stopSpeaking()
                                    : speakMessage(message)
                                }
                              >
                                {isFetchingThis ? (
                                  <>
                                    <Loader2
                                      size={14}
                                      className="tts-spinner"
                                    />
                                    Cargando...
                                  </>
                                ) : isPlayingThis ? (
                                  <>
                                    <VolumeX size={14} />
                                    Detener
                                  </>
                                ) : (
                                  <>
                                    <Volume2 size={14} />
                                    Escuchar
                                  </>
                                )}
                              </button>
                            </div>
                          ) : null}
                          {message.role === "user" ? (
                            <div className="message-actions user-message-actions">
                              <button
                                className="copy-action"
                                onClick={() => copyText(message)}
                              >
                                {copiedId === message.id ? (
                                  <Check size={14} />
                                ) : (
                                  <Copy size={14} />
                                )}
                                {copiedId === message.id ? "Copiado" : "Copiar"}
                              </button>
                              <button
                                className="copy-action"
                                onClick={() => (loading ? stopGeneration() : resendMessage(message))}
                              >
                                {loading ? <Square size={14} /> : <RotateCcw size={14} />}
                                {loading ? "Detener" : "Reenviar"}
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>

            {!welcomeVisible && ttsError ? (
              <div className="tts-error-toast">
                <VolumeX size={15} />
                {ttsError}
              </div>
            ) : null}

            {!welcomeVisible && mode === "deep" ? (
              <div className="expert-notice">
                <Brain size={16} />
                Modo Experto activo: respuestas mas completas para analisis,
                planeacion y materiales.
              </div>
            ) : null}

            {!welcomeVisible && <form className="composer" onSubmit={sendMessage}>
              <div className="mode-trigger-wrap" ref={modePickerRef}>
                {modePickerOpen && (
                  <div className="mode-picker">
                    {(Object.keys(MODES) as ModeKey[]).map((key) => {
                      const ModeIcon = MODES[key].icon;
                      const active = mode === key;
                      return (
                        <button
                          key={key}
                          className={`mode-picker-card${active ? ' active' : ''}`}
                          type="button"
                          onClick={() => { setMode(key as ModeKey); setModePickerOpen(false); }}
                        >
                          <span
                            className="mode-picker-icon"
                            style={{ background: MODES[key].iconBg, color: MODES[key].iconColor }}
                          >
                            <ModeIcon size={17} />
                          </span>
                          <span className="mode-picker-text">
                            <strong>{MODES[key].label}</strong>
                            <span>{MODES[key].desc}</span>
                          </span>
                          {active && <Check size={14} className="mode-picker-check" />}
                        </button>
                      );
                    })}
                  </div>
                )}
                <button
                  className={`mode-trigger${modePickerOpen ? ' open' : ''}`}
                  type="button"
                  onClick={() => setModePickerOpen(v => !v)}
                  title="Cambiar modo de respuesta"
                >
                  {(() => { const ModeIcon = MODES[mode].icon; return <ModeIcon size={14} />; })()}
                  {MODES[mode].label}
                  <ChevronDown size={12} className="mode-trigger-chevron" />
                </button>
              </div>

              <textarea
                ref={chatInputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={
                  sttLoading
                    ? "Transcribiendo audio..."
                    : recording
                      ? "Grabando... pulsa para detener"
                      : "Investiga un tema con ACoreAI..."
                }
                rows={1}
                disabled={loading}
              />
              <div className="ctip-wrap">
                <button
                  className={`mic-button ${recording ? "recording" : ""} ${sttLoading ? "loading" : ""}`}
                  type="button"
                  onClick={() => (recording ? stopRecording() : startRecording())}
                  disabled={loading || sttLoading}
                >
                  {sttLoading ? (
                    <Loader2 size={18} className="tts-spinner" />
                  ) : recording ? (
                    <MicOff size={18} />
                  ) : (
                    <Mic size={18} />
                  )}
                </button>
                <div className="ctip ctip--left">
                  <strong>Dictar por voz</strong>
                  <span>Pulsa y habla. ACoreAI transcribirá tu pregunta automáticamente.</span>
                </div>
              </div>

              <div className="ctip-wrap">
                <button
                  className={`composer-voice-btn${voiceOpen ? " active" : ""}`}
                  type="button"
                  onClick={() => setVoiceOpen(true)}
                  aria-label="Modo conversación de voz"
                >
                  <AudioLines size={18} />
                </button>
                <div className="ctip ctip--left">
                  <strong>Conversación de voz</strong>
                  <span>Habla con ACoreAI directamente, sin necesidad de escribir nada.</span>
                </div>
              </div>

              <div className="ctip-wrap">
                <button
                  className="send-button"
                  type="submit"
                  disabled={!input.trim() || loading}
                >
                  <Send size={18} />
                </button>
                <div className="ctip ctip--right">
                  <strong>Enviar consulta</strong>
                  <span>Envía tu pregunta a ACoreAI. También puedes usar Enter ↵.</span>
                </div>
              </div>
            </form>}
          </>
        ) : tab === "translate" ? (
          <div className="idiomas-wrapper">
            <div className="idiomas-with-subnav">
                <nav className="idiomas-subnav">
                  {([
                    { key: 'home'     as const, icon: <Sparkles size={18} />,  label: 'Inicio',   desc: 'Para ti',     color: 'teal'   },
                    { key: 'traducir' as const, icon: <Languages size={18} />, label: 'Traducir', desc: 'Multilingüe', color: 'blue'   },
                  ]).map(item => (
                    <button
                      key={item.key}
                      className={`idiomas-subnav-btn idiomas-subnav-btn--${item.color}${idiomasTab === item.key ? ' active' : ''}`}
                      onClick={() => {
                        setIdiomasTab(item.key);
                        if (item.key === 'home') setIdiomasShowAll(false);
                      }}
                    >
                      <span className="isb-icon">{item.icon}</span>
                      <span className="isb-texts">
                        <span className="isb-label">{item.label}</span>
                        <span className="isb-desc">{item.desc}</span>
                      </span>
                    </button>
                  ))}
                </nav>
                <div className="idiomas-subnav-content" key={idiomasTab}>
                {idiomasTab === 'home' ? (
              (() => {
                const hour = new Date().getHours();
                const greeting = hour < 12 ? 'Buenos días' : hour < 18 ? 'Buenas tardes' : 'Buenas noches';
                const firstName = user.name.split(' ')[0];

                const personalizedTopics: { level: EnglishLevelDef; topic: { emoji: string; label: string; starter: string }; interest: string }[] = [];
                if (aiProfile && aiProfile.interestTopics.length > 0) {
                  const seen = new Set<string>();
                  for (const interest of aiProfile.interestTopics) {
                    for (const { level, topic } of resolveTopics(getTopicsForInterest(interest))) {
                      const k = `${level.key}-${topic.label}`;
                      if (!seen.has(k)) { seen.add(k); personalizedTopics.push({ level, topic, interest }); }
                    }
                  }
                }

                return (
                  <section className="ih2">
                    <div className="ih2-hero">
                      <div className="ih2-hero-left">
                        <div className="ih2-greet">{greeting}, {firstName} 👋</div>
                        <div className="ih2-sub">Sigue practicando tu inglés hoy</div>
                        {aiProfile && (
                          <div className="ih2-hero-chips">
                            <span className="ih2-chip ih2-chip--teal">{LEVEL_LABELS[aiProfile.englishLevel]}</span>
                            <span className="ih2-chip ih2-chip--purple">{PRACTICE_LABELS[aiProfile.practiceStyle]}</span>
                          </div>
                        )}
                      </div>
                      <div className="ih2-hero-deco" aria-hidden>🌐</div>
                    </div>

                    <div className="ih2-actions">
                      <button className="ih2-qa ih2-qa--blue" onClick={() => setIdiomasTab('traducir')}>
                        <Languages size={16} /><span>Traducir</span>
                      </button>
                      {aiProfile && personalizedTopics.length > 0 && (
                        <button
                          className="ih2-qa ih2-qa--purple"
                          onClick={() => {
                            const rand = personalizedTopics[Math.floor(Math.random() * personalizedTopics.length)];
                            setPracticeAutoTopic({ starter: rand.topic.starter, levelKey: rand.level.key });
                            setIdiomasTab('practicar');
                          }}
                        >
                          <Zap size={16} /><span>Sorpréndeme</span>
                        </button>
                      )}
                    </div>

                    {personalizedTopics.length > 0 && (
                      <div className="ih2-section">
                        <div className="ih2-section-hd">
                          <Sparkles size={14} />
                          <span className="ih2-section-title">Para ti</span>
                          <span className="ih2-section-sub">basado en tus intereses</span>
                        </div>
                        <div className="ih2-topic-scroll">
                          {personalizedTopics.slice(0, idiomasShowAll ? undefined : 8).map(({ level, topic, interest }) => (
                            <button
                              key={`${level.key}-${topic.label}`}
                              className="ih2-topic-card"
                              onClick={() => {
                                setPracticeAutoTopic({ starter: topic.starter, levelKey: level.key });
                                setIdiomasTab('practicar');
                              }}
                            >
                              <div className={`ih2-tc-cover ih2-tc-cover--${level.key.toLowerCase()}`}>
                                <span className="ih2-tc-emoji">{topic.emoji}</span>
                              </div>
                              <div className="ih2-tc-body">
                                <span className="ih2-tc-interest">{interest}</span>
                                <strong className="ih2-tc-label">{topic.label}</strong>
                                <span className={`ih2-tc-badge ih2-tc-badge--${level.key.toLowerCase()}`}>{level.emoji} {level.key}</span>
                              </div>
                            </button>
                          ))}
                        </div>
                        {personalizedTopics.length > 8 && (
                          <button className="ih2-ver-mas" onClick={() => setIdiomasShowAll(v => !v)}>
                            {idiomasShowAll ? '↑ Ver menos' : `↓ Ver ${personalizedTopics.length - 8} temas más`}
                          </button>
                        )}
                      </div>
                    )}

                    <div className="ih2-section ih2-section--nivel">
                      <div className="ih2-section-hd">
                        <Layers size={14} />
                        <span className="ih2-section-title">Practica</span>
                        <span className="ih2-section-sub">elige tu nivel y comienza</span>
                      </div>

                      <div className="ih2-level-row">
                        {ENGLISH_LEVELS.map((l, idx) => (
                          <button
                            key={l.key}
                            type="button"
                            className={`ih2-level-card${homeSelectedLevelIdx === idx ? ' ih2-level-card--active' : ''}`}
                            style={{ '--lc': l.color } as React.CSSProperties}
                            onClick={() => setHomeSelectedLevelIdx(idx)}
                          >
                            <span className="ih2-lc-emoji">{l.emoji}</span>
                            <span className="ih2-lc-name">{l.key}</span>
                            <span className="ih2-lc-desc">{l.desc}</span>
                            <span className="ih2-lc-count">{l.topics.length} temas</span>
                          </button>
                        ))}
                      </div>

                      {(() => {
                        const level = ENGLISH_LEVELS[homeSelectedLevelIdx];
                        return (
                          <div className="ih2-nivel-content">
                            {level.categories.map((cat: TopicCategory) => (
                              <div key={cat.label} className="ih2-nivel-cat" style={{ '--lc': level.color } as React.CSSProperties}>
                                <div className="ih2-nivel-cat-hd">
                                  <span className="ih2-nivel-cat-emoji">{cat.emoji}</span>
                                  <span className="ih2-nivel-cat-name">{cat.label}</span>
                                  <span className="ih2-nivel-cat-count">{cat.topics.length}</span>
                                </div>
                                <div className="ih2-nivel-grid">
                                  {cat.topics.map(t => (
                                    <button
                                      key={t.label}
                                      type="button"
                                      className="ih2-nivel-tile"
                                      style={{ '--lc': level.color } as React.CSSProperties}
                                      onClick={() => {
                                        setPracticeAutoTopic({ starter: t.starter, levelKey: level.key });
                                        setIdiomasTab('practicar');
                                      }}
                                    >
                                      <span className="ih2-nivel-tile-emoji">{t.emoji}</span>
                                      <span className="ih2-nivel-tile-label">{t.label}</span>
                                      <span className="ih2-nivel-tile-arrow">›</span>
                                    </button>
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>

                    {!aiProfile && (
                      <div className="idiomas-home-empty">
                        <Languages size={36} />
                        <strong>Personaliza tu experiencia</strong>
                        <span>Completa tu perfil para ver sugerencias basadas en tus intereses.</span>
                        <button className="primary-action" onClick={() => setEditingProfile(true)}>
                          Completar perfil <Sparkles size={15} />
                        </button>
                      </div>
                    )}
                  </section>
                );
              })()
            ) : idiomasTab === 'practicar' ? (
              <div className="idiomas-fullscreen-wrap">
                <LanguagePractice
                  open={true}
                  onClose={() => setIdiomasTab('home')}
                  user={user}
                  model={SPEECH_PRACTICE_MODEL}
                  resumeConversationId={resumePracticeId}
                  resumeLevel={resumePracticeLevel ?? practiceAutoTopic?.levelKey ?? null}
                  autoStartTopic={practiceAutoTopic}
                  onConversationChange={() => {
                    setPracticeAutoTopic(null);
                    refreshConversations();
                  }}
                />
              </div>
            ) : (
          <section className="translate-panel">

            <div className="translate-lang-row">
              <div className="translate-lang-group">
                <span className="translate-lang-group-label">De</span>
                <div className="translate-lang-pills">
                  {LANGUAGES.map(({ key, label, flag }) => (
                    <button
                      key={key}
                      type="button"
                      className={`lang-pill${translateSourceLang === key ? ' active' : ''}`}
                      onClick={() => {
                        if (key === translateLangs[0]) {
                          setTranslateLangs([translateSourceLang]);
                        }
                        setTranslateSourceLang(key);
                        setTranslations({});
                      }}
                    >
                      <span>{flag}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                className="translate-swap-btn"
                title="Intercambiar idiomas"
                onClick={() => {
                  const prevSource = translateSourceLang;
                  const prevTarget = translateLangs[0];
                  if (prevTarget) {
                    setTranslateSourceLang(prevTarget);
                    setTranslateLangs([prevSource]);
                    setTranslateInput(translations[prevTarget] ?? '');
                    setTranslations({});
                  }
                }}
              >
                <ArrowLeftRight size={16} />
              </button>

              <div className="translate-lang-group">
                <span className="translate-lang-group-label">A</span>
                <div className="translate-lang-pills">
                  {LANGUAGES.map(({ key, label, flag }) => (
                    <button
                      key={key}
                      type="button"
                      className={`lang-pill${translateLangs.includes(key) ? ' active' : ''}`}
                      onClick={() => {
                        if (key === translateSourceLang) {
                          setTranslateSourceLang(translateLangs[0] ?? translateSourceLang);
                        }
                        toggleLanguage(key);
                        setTranslations({});
                      }}
                    >
                      <span>{flag}</span>
                      <span>{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="translate-split">

              {(() => {
                const srcEntry = LANGUAGES.find(l => l.key === translateSourceLang);
                return (
              <form className="translate-split-pane translate-split-pane--input" onSubmit={runTranslate}>
                <div className="translate-pane-header">
                  <span className="translate-pane-flag">{srcEntry?.flag}</span>
                  <span className="translate-pane-lang">{srcEntry?.label}</span>
                  {translateInput.trim() && (
                    <button
                      type="button"
                      className="translate-clear-btn"
                      onClick={() => { setTranslateInput(''); setTranslations({}); }}
                      title="Limpiar"
                    >✕</button>
                  )}
                </div>
                <div className="translate-textarea-wrap">
                  <textarea
                    value={translateInput}
                    onChange={(event) => setTranslateInput(event.target.value)}
                    placeholder={
                      recording
                        ? "Grabando... pulsa el mic para detener"
                        : sttLoading
                          ? "Transcribiendo..."
                          : `Escribe en ${srcEntry?.label ?? 'el idioma seleccionado'}...`
                    }
                    rows={6}
                  />
                  <button
                    type="button"
                    className={`mic-button translate-mic ${recording ? "recording" : ""} ${sttLoading ? "loading" : ""}`}
                    title={recording ? "Detener grabación" : "Dictar texto por voz"}
                    onClick={() =>
                      recording
                        ? stopRecording()
                        : startRecording({
                          language: "auto",
                          onTranscribed: (t) =>
                            setTranslateInput((prev) =>
                              prev ? `${prev} ${t}` : t,
                            ),
                        })
                    }
                    disabled={sttLoading}
                  >
                    {sttLoading ? (
                      <Loader2 size={16} className="tts-spinner" />
                    ) : recording ? (
                      <MicOff size={16} />
                    ) : (
                      <Mic size={16} />
                    )}
                  </button>
                </div>
                <button
                  className="primary-action"
                  disabled={
                    !translateInput.trim() ||
                    translateLangs.length === 0 ||
                    translateLoading
                  }
                >
                  {translateLoading ? "Traduciendo..." : "Traducir"}
                  <Sparkles size={17} />
                </button>
              </form>
                );
              })()}

              {(() => {
                const tgtEntry = LANGUAGES.find(l => l.key === translateLangs[0]);
                return (
              <div className="translate-split-pane translate-split-pane--result">
                <div className="translate-pane-header">
                  <span className="translate-pane-flag">{tgtEntry?.flag ?? <Languages size={16} />}</span>
                  <span className="translate-pane-lang">{tgtEntry?.label ?? 'Selecciona un idioma'}</span>
                  {Object.keys(translations).length > 0 && (() => {
                    const lang = translateLangs[0];
                    const value = translations[lang] ?? '';
                    const isFetching = fetchingTranslLang === lang;
                    const isPlaying = playingTranslLang === lang;
                    return (
                      <button
                        className={`tts-action ${isPlaying ? "active" : ""}`}
                        type="button"
                        onClick={() =>
                          isFetching || isPlaying
                            ? stopTranslationAudio()
                            : speakTranslation(lang, value)
                        }
                      >
                        {isFetching ? (
                          <><Loader2 size={13} className="tts-spinner" />Cargando</>
                        ) : isPlaying ? (
                          <><VolumeX size={13} />Detener</>
                        ) : (
                          <><Volume2 size={13} />Escuchar</>
                        )}
                      </button>
                    );
                  })()}
                </div>
                {Object.keys(translations).length > 0 ? (
                  <>
                    <p className="translate-result-text">
                      {translations[translateLangs[0]] ?? ''}
                    </p>
                    <button
                      type="button"
                      className={`save-translation-btn${translSaved ? ' save-translation-btn--saved' : ''}`}
                      onClick={handleSaveTranslation}
                      disabled={translSaved}
                    >
                      {translSaved ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
                      {translSaved ? 'Guardado' : 'Guardar traducción'}
                    </button>
                  </>
                ) : (
                  <div className="translate-result-empty">
                    <Languages size={36} />
                    <p>{translateLangs.length === 0 ? 'Selecciona un idioma destino' : 'La traducción aparecerá aquí'}</p>
                  </div>
                )}
              </div>
                );
              })()}

            </div>
          </section>
                )}
                </div>
              </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
