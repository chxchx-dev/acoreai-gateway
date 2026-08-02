import { useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import type {
  CompleteAiOnboardingRequest,
  CorrectionStyle,
  EnglishLevel,
  PracticeStyle,
  PreferredMode,
} from '../../types/ai-profile';
const logoAiACoreAI = undefined;
const acoreaiHola = undefined;

// ── Data ───────────────────────────────────────────────────────────────────────

const TOPICS = [
  'Tecnología', 'Videojuegos', 'Música', 'Películas y series', 'Deportes',
  'Viajes', 'Colegio / universidad', 'Trabajo', 'Entrevistas laborales',
  'Emprendimiento', 'Cultura general', 'Ciencia', 'Inteligencia artificial',
  'Vida diaria', 'Comida', 'Redes sociales', 'Medio ambiente',
  'Presentaciones académicas',
];

const GOALS = [
  'Practicar conversación en inglés',
  'Mejorar traducciones',
  'Resolver dudas académicas',
  'Investigar con pensamiento crítico',
  'Prepararme para clases, trabajos o exposiciones',
];

const MODE_OPTIONS: { value: PreferredMode; label: string; desc: string; emoji: string }[] = [
  { value: 'languages', label: 'Idiomas', desc: 'Práctica de inglés y traducción guiada', emoji: '🌐' },
  { value: 'explore', label: 'Explora', desc: 'Investigación académica y análisis crítico', emoji: '🔬' },
  { value: 'both', label: 'Ambos', desc: 'Usa todos los modos según lo necesites', emoji: '✨' },
];

const ENGLISH_LEVELS: { value: EnglishLevel; label: string; sub: string; emoji: string }[] = [
  { value: 'beginner', label: 'Principiante', sub: 'A1 / A2', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermedio', sub: 'B1 / B2', emoji: '⭐' },
  { value: 'advanced', label: 'Avanzado', sub: 'C1', emoji: '🚀' },
  { value: 'unknown', label: 'No estoy seguro', sub: 'Te asignamos nivel inicial', emoji: '🤔' },
];

const CORRECTION_STYLES: { value: CorrectionStyle; label: string; desc: string; emoji: string }[] = [
  { value: 'soft', label: 'Suave', desc: 'Corrige solo errores importantes', emoji: '🌿' },
  { value: 'balanced', label: 'Equilibrado', desc: 'Corrige y mejora frases naturales', emoji: '⚖️' },
  { value: 'strict', label: 'Estricto', desc: 'Corrige gramática, vocabulario y estructura', emoji: '🎯' },
];

const PRACTICE_STYLES: { value: PracticeStyle; label: string; emoji: string }[] = [
  { value: 'free_conversation', label: 'Conversación libre', emoji: '💬' },
  { value: 'guided_situations', label: 'Situaciones guiadas', emoji: '🗺️' },
  { value: 'qa', label: 'Pregunta y respuesta', emoji: '❓' },
  { value: 'roleplay', label: 'Roleplay', emoji: '🎭' },
  { value: 'interview', label: 'Prep. para entrevista', emoji: '💼' },
  { value: 'academic_presentation', label: 'Presentación académica', emoji: '🎓' },
];

// ── Label helpers ──────────────────────────────────────────────────────────────

export const LEVEL_LABELS: Record<EnglishLevel, string> = {
  beginner: 'Principiante 🌱',
  intermediate: 'Intermedio ⭐',
  advanced: 'Avanzado 🚀',
  unknown: 'Por evaluar 🤔',
};

export const PRACTICE_LABELS: Record<PracticeStyle, string> = {
  free_conversation: 'Conversación libre',
  guided_situations: 'Situaciones guiadas',
  qa: 'Pregunta y respuesta',
  roleplay: 'Roleplay',
  interview: 'Prep. para entrevista',
  academic_presentation: 'Presentación académica',
};

export const MODE_LABELS: Record<PreferredMode, string> = {
  languages: 'Idiomas 🌐',
  explore: 'Explora 🔬',
  both: 'Ambos ✨',
};

export const CORRECTION_LABELS: Record<CorrectionStyle, string> = {
  soft: 'Suave 🌿',
  balanced: 'Equilibrado ⚖️',
  strict: 'Estricto 🎯',
};

// ── Wizard ─────────────────────────────────────────────────────────────────────

interface Props {
  userId: string;
  userName: string;
  onComplete: (data: CompleteAiOnboardingRequest) => Promise<void>;
}

type Draft = Partial<CompleteAiOnboardingRequest>;

const TOTAL_CONFIG_STEPS = 6;

export function AiOnboardingWizard({ userId: _userId, userName, onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>({ interestTopics: [] });
  const [saving, setSaving] = useState(false);

  const topics = draft.interestTopics ?? [];
  const firstName = userName.split(' ')[0];

  function canAdvance(): boolean {
    switch (step) {
      case 0: return true;
      case 1: return !!draft.preferredMode;
      case 2: return !!draft.mainGoal;
      case 3: return !!draft.englishLevel;
      case 4: return topics.length === 5;
      case 5: return !!draft.correctionStyle;
      case 6: return !!draft.practiceStyle;
      case 7: return !saving;
      default: return false;
    }
  }

  async function next() {
    if (step < 7) {
      setStep(s => s + 1);
    } else {
      setSaving(true);
      try {
        await onComplete(draft as CompleteAiOnboardingRequest);
      } finally {
        setSaving(false);
      }
    }
  }

  function back() {
    if (step > 0) setStep(s => s - 1);
  }

  function toggleTopic(topic: string) {
    const current = draft.interestTopics ?? [];
    if (current.includes(topic)) {
      setDraft(d => ({ ...d, interestTopics: current.filter(t => t !== topic) }));
    } else if (current.length < 5) {
      setDraft(d => ({ ...d, interestTopics: [...current, topic] }));
    }
  }

  const isLastStep = step === 7;
  const configStep = step > 0 && step <= TOTAL_CONFIG_STEPS ? step : null;

  return (
    <div className="ob-overlay">
      <div className="ob-bg-grid" />

      <div className="ob-card">
        {/* Logo */}
        <div className="ob-logo-row">
          <img src={logoAiACoreAI} alt="ACoreAI" className="ob-logo" />
          <span className="ob-logo-name">ACoreAI</span>
        </div>

        {/* Progress dots — only on config steps 1-6 */}
        {configStep !== null && (
          <div className="ob-progress">
            {Array.from({ length: TOTAL_CONFIG_STEPS }).map((_, i) => (
              <span
                key={i}
                className={`ob-progress-dot${i + 1 === configStep ? ' active' : i + 1 < configStep ? ' done' : ''}`}
              />
            ))}
          </div>
        )}

        {/* Step content */}
        <div className="ob-step-content">
          {step === 0 && <StepWelcome firstName={firstName} />}
          {step === 1 && (
            <StepMode
              value={draft.preferredMode}
              onChange={v => setDraft(d => ({ ...d, preferredMode: v }))}
            />
          )}
          {step === 2 && (
            <StepGoal
              value={draft.mainGoal}
              onChange={v => setDraft(d => ({ ...d, mainGoal: v }))}
            />
          )}
          {step === 3 && (
            <StepLevel
              value={draft.englishLevel}
              onChange={v => setDraft(d => ({ ...d, englishLevel: v }))}
            />
          )}
          {step === 4 && (
            <StepTopics selected={topics} onToggle={toggleTopic} />
          )}
          {step === 5 && (
            <StepCorrection
              value={draft.correctionStyle}
              onChange={v => setDraft(d => ({ ...d, correctionStyle: v }))}
            />
          )}
          {step === 6 && (
            <StepPractice
              value={draft.practiceStyle}
              onChange={v => setDraft(d => ({ ...d, practiceStyle: v }))}
            />
          )}
          {step === 7 && <StepSummary draft={draft} firstName={firstName} />}
        </div>

        {/* Navigation */}
        <div className={`ob-nav${step > 0 ? ' ob-nav--split' : ''}`}>
          {step > 0 && (
            <button className="ob-btn-back" onClick={back} type="button">
              <ChevronLeft size={15} />
              Atrás
            </button>
          )}
          <button
            className="ob-btn-next"
            onClick={next}
            disabled={!canAdvance()}
            type="button"
          >
            {step === 0 ? (
              <>Empezar configuración <Sparkles size={15} /></>
            ) : isLastStep && saving ? (
              <><Loader2 size={15} className="ob-spinner" />Guardando...</>
            ) : isLastStep ? (
              <>Crear mi experiencia <Check size={15} /></>
            ) : (
              <>Continuar <ChevronRight size={15} /></>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Steps ──────────────────────────────────────────────────────────────────────

function StepWelcome({ firstName }: { firstName: string }) {
  return (
    <div className="ob-welcome">
      <img src={acoreaiHola} alt="ACoreAI saludando" className="ob-welcome-avatar" />
      <h1 className="ob-welcome-title">
        Hola, <span className="ob-accent-text">{firstName}</span> 👋
      </h1>
      <p className="ob-welcome-desc">
        Antes de empezar, ACoreAI necesita conocer tu objetivo para adaptar las
        respuestas, ejercicios y temas de conversación a tu perfil académico.
      </p>
      <p className="ob-welcome-note">Solo configuramos esto una vez.</p>
    </div>
  );
}

function StepMode({
  value,
  onChange,
}: {
  value?: PreferredMode;
  onChange: (v: PreferredMode) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">¿Qué modo quieres priorizar?</h2>
      <div className="ob-option-grid">
        {MODE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`ob-option-card${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="ob-option-emoji">{opt.emoji}</span>
            <span className="ob-option-text">
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </span>
            {value === opt.value && <Check size={15} className="ob-option-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepGoal({
  value,
  onChange,
}: {
  value?: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">¿Qué quieres mejorar principalmente?</h2>
      <div className="ob-option-grid">
        {GOALS.map(goal => (
          <button
            key={goal}
            className={`ob-option-card${value === goal ? ' selected' : ''}`}
            onClick={() => onChange(goal)}
            type="button"
          >
            <span className="ob-option-text">
              <strong>{goal}</strong>
            </span>
            {value === goal && <Check size={15} className="ob-option-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepLevel({
  value,
  onChange,
}: {
  value?: EnglishLevel;
  onChange: (v: EnglishLevel) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">¿Cuál es tu nivel actual de inglés?</h2>
      <div className="ob-option-grid">
        {ENGLISH_LEVELS.map(opt => (
          <button
            key={opt.value}
            className={`ob-option-card${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="ob-option-emoji">{opt.emoji}</span>
            <span className="ob-option-text">
              <strong>{opt.label}</strong>
              <span>{opt.sub}</span>
            </span>
            {value === opt.value && <Check size={15} className="ob-option-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepTopics({
  selected,
  onToggle,
}: {
  selected: string[];
  onToggle: (t: string) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">Selecciona 5 temas de interés</h2>
      <p className="ob-step-hint">
        <span className={selected.length === 5 ? 'ob-hint-done' : ''}>
          {selected.length}/5 seleccionados
        </span>
        {' '}— para personalizar tu práctica de inglés
      </p>
      <div className="ob-topic-grid">
        {TOPICS.map(topic => {
          const isSelected = selected.includes(topic);
          const isDisabled = !isSelected && selected.length >= 5;
          return (
            <button
              key={topic}
              className={`ob-topic-chip${isSelected ? ' selected' : ''}${isDisabled ? ' disabled' : ''}`}
              onClick={() => onToggle(topic)}
              disabled={isDisabled}
              type="button"
            >
              {isSelected && <Check size={11} />}
              {topic}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StepCorrection({
  value,
  onChange,
}: {
  value?: CorrectionStyle;
  onChange: (v: CorrectionStyle) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">¿Cómo quieres que ACoreAI corrija tu inglés?</h2>
      <div className="ob-option-grid">
        {CORRECTION_STYLES.map(opt => (
          <button
            key={opt.value}
            className={`ob-option-card${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="ob-option-emoji">{opt.emoji}</span>
            <span className="ob-option-text">
              <strong>{opt.label}</strong>
              <span>{opt.desc}</span>
            </span>
            {value === opt.value && <Check size={15} className="ob-option-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepPractice({
  value,
  onChange,
}: {
  value?: PracticeStyle;
  onChange: (v: PracticeStyle) => void;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">¿Cómo prefieres practicar?</h2>
      <div className="ob-option-grid ob-option-grid--2col">
        {PRACTICE_STYLES.map(opt => (
          <button
            key={opt.value}
            className={`ob-option-card${value === opt.value ? ' selected' : ''}`}
            onClick={() => onChange(opt.value)}
            type="button"
          >
            <span className="ob-option-emoji">{opt.emoji}</span>
            <span className="ob-option-text">
              <strong>{opt.label}</strong>
            </span>
            {value === opt.value && <Check size={14} className="ob-option-check" />}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepSummary({
  draft,
  firstName,
}: {
  draft: Draft;
  firstName: string;
}) {
  return (
    <div className="ob-step">
      <h2 className="ob-step-title">Tu perfil está listo, {firstName} ✨</h2>
      <p className="ob-step-hint">Revisa antes de confirmar</p>
      <div className="ob-summary-card">
        <SummaryRow
          label="Modo principal"
          value={MODE_LABELS[draft.preferredMode!] ?? ''}
        />
        <SummaryRow label="Objetivo" value={draft.mainGoal ?? ''} />
        <SummaryRow
          label="Nivel de inglés"
          value={LEVEL_LABELS[draft.englishLevel!] ?? ''}
        />
        <SummaryRow
          label="Temas"
          value={(draft.interestTopics ?? []).join(', ')}
        />
        <SummaryRow
          label="Corrección"
          value={CORRECTION_LABELS[draft.correctionStyle!] ?? ''}
        />
        <SummaryRow
          label="Práctica preferida"
          value={PRACTICE_LABELS[draft.practiceStyle!] ?? ''}
        />
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="ob-summary-row">
      <span className="ob-summary-label">{label}</span>
      <span className="ob-summary-value">{value}</span>
    </div>
  );
}
