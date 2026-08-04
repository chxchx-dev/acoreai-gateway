import React, { useState, useEffect, useCallback } from 'react';
import {
  Lock, CheckCircle2, ArrowLeft, Trophy, Loader2,
  BookOpen, Mic, Headphones, Zap, RotateCcw, Star, ChevronRight, Sparkles,
  Shield, Crown, Leaf,
} from 'lucide-react';
const acoreaiIndicating = undefined;
const acoreaiHeart = undefined;
const acoreaiNopasa = undefined;
const acoreaiIdea = undefined;
const acoreaiStuding = undefined;
const acoreaiHola = undefined;
import {
  fetchLanguageDashboard, generateAdventurePhase,
  getAdventurePhase, startLesson, completeLesson, getAdventureExam, submitExamAttempt,
  completeHiddenLevel, listAdventurePhases,
} from '../lib/gateway';
import type { DemoUser } from '../lib/auth';

// ── Types ────────────────────────────────────────────────────────────────────

interface LangProfile {
  id: string;
  currentLevel: number;
  currentXp: number;
  totalXp: number;
  currentPhaseId: string | null;
  selectedTitleId: string | null;
  titles: { title: { id: string; name: string; code: string } }[];
  phases?: PhaseHistory[];
}

interface PhaseHistory {
  id: string;
  phaseNumber: number;
  topic: string;
  topicSlug: string;
  cefrLevel: string | null;
  difficultyLevel: number;
  status: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Phase {
  id: string;
  topic: string;
  cefrLevel: string;
  phaseNumber: number;
  status: string;
  lessons: Lesson[];
  exams: Exam[];
  hiddenLevels: HiddenLevel[];
}

interface LessonContent {
  intro: string;
  vocabulary: { term: string; meaningEs: string; example: string }[];
  grammar: string;
  practice: { type: string; question: string; answer: string; options?: string[]; explanationEs?: string }[];
  feedbackRules: string[];
  passThreshold?: number;
  generated?: boolean;
}

interface Lesson {
  id: string;
  lessonNumber: number;
  type: string;
  title: string;
  objective: string;
  status?: LessonStatus;
  content?: LessonContent;
}

interface Exam {
  id: string;
  type: 'PRE_TEST' | 'MIDTERM' | 'FINAL_EXAM';
  unlockAfter: number;
  title: string;
  questions: { type: string; question: string; answer: string; options?: string[]; explanationEs?: string }[];
  attempts?: { score: number; passed: boolean }[];
}

interface HiddenLevel {
  id: string;
  unlockBlockStart: number;
  unlockBlockEnd: number;
  title: string;
  completedAt: string | null;
}

type LessonStatus = 'LOCKED' | 'AVAILABLE' | 'IN_PROGRESS' | 'COMPLETED' | 'NEEDS_REVIEW';

type View = 'dashboard' | 'map' | 'lesson' | 'exam' | 'hidden';

function normalizePracticeAnswer(value: unknown): string {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isOptionLetter(value: string): boolean {
  return ['a', 'b', 'c', 'd'].includes(normalizePracticeAnswer(value));
}

function resolveQuestionAnswer(
  question: { answer: string; options?: string[] },
  answer: string,
): string {
  const options = Array.isArray(question.options) ? question.options.map(item => String(item)) : [];
  const normalized = normalizePracticeAnswer(answer);
  if (!options.length || !isOptionLetter(answer)) return answer;

  const index = normalized.charCodeAt(0) - 97;
  return options[index] ?? answer;
}

function isCorrectQuestionAnswer(
  question: { answer: string; options?: string[] },
  userAnswer: string,
): boolean {
  const normalizedUser = normalizePracticeAnswer(userAnswer);
  const normalizedExpected = normalizePracticeAnswer(question.answer);
  if (normalizedUser === normalizedExpected) return true;

  const resolvedExpected = resolveQuestionAnswer(question, question.answer);
  if (normalizePracticeAnswer(resolvedExpected) === normalizedUser) return true;

  const resolvedUser = resolveQuestionAnswer(question, userAnswer);
  return normalizePracticeAnswer(resolvedUser) === normalizedExpected;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function xpForLevel(level: number): number {
  if (level < 10) return 100;
  if (level < 20) return 150;
  if (level < 50) return 200;
  if (level < 100) return 250;
  return 300;
}

function getTierIcon(level: number): { icon: React.ReactNode; label: string; cls: string } {
  const tier = Math.floor((level - 1) / 10);
  if (tier <= 0) return { icon: <Leaf size={22} />,     label: 'Novato',    cls: 'tier--novato'    };
  if (tier === 1) return { icon: <Sparkles size={22} />, label: 'Aprendiz',  cls: 'tier--aprendiz'  };
  if (tier === 2) return { icon: <Zap size={22} />,      label: 'Adepto',    cls: 'tier--adepto'    };
  if (tier === 3) return { icon: <Star size={22} />,     label: 'Experto',   cls: 'tier--experto'   };
  if (tier === 4) return { icon: <Shield size={22} />,   label: 'Élite',     cls: 'tier--elite'     };
  if (tier === 5) return { icon: <Crown size={22} />,    label: 'Maestro',   cls: 'tier--maestro'   };
  return           { icon: <Trophy size={22} />,         label: 'Leyenda',   cls: 'tier--leyenda'   };
}

const LESSON_TYPE_ICON: Record<string, typeof BookOpen> = {
  LESSON: BookOpen,
  SPEAKING: Mic,
  LISTENING: Headphones,
  PRACTICE: Zap,
  REVIEW: RotateCcw,
  HIDDEN: Star,
};

const LESSON_EMOJI: Record<string, string> = {
  LESSON:    '📖',
  SPEAKING:  '🎤',
  LISTENING: '👂',
  PRACTICE:  '⚡',
  REVIEW:    '🔄',
  HIDDEN:    '🌟',
};

const CEFR_LABELS: Record<string, string> = {
  A1: 'Principiante',
  A2: 'Elemental',
  B1: 'Intermedio',
  B2: 'Avanzado',
  C1: 'Proficiency',
};

// ── Node positioning ──────────────────────────────────────────────────────────

interface NodeInfo {
  id: string;
  lessonNumber?: number;
  examType?: string;
  isExam: boolean;
  isHidden?: boolean;
  lesson?: Lesson;
  exam?: Exam;
  hidden?: HiddenLevel;
  status: string;
  x: number;   // percentage 0-100 of container width
  y: number;   // px from top
}

function computeNodePositions(
  lessons: Lesson[],
  exams: Exam[],
  hiddenLevels: HiddenLevel[],
  progress: Record<string, LessonStatus>,
): NodeInfo[] {
  const nodes: NodeInfo[] = [];
  const NODE_SPACING_Y = 140;
  const CHAPTER_BREAK_EXTRA = 100; // extra gap before chapters 2 and 3 for banner room
  const ZIGZAG_POSITIONS = [22, 50, 78, 50];

  let yOffset = 160; // start lower to leave room for chapter 1 banner
  let posIdx = 0;

  for (const lesson of lessons) {
    // Extra space before each new chapter (not chapter 1)
    if (lesson.lessonNumber === 11 || lesson.lessonNumber === 21) {
      yOffset += CHAPTER_BREAK_EXTRA;
    }
    nodes.push({
      id: lesson.id,
      lessonNumber: lesson.lessonNumber,
      isExam: false,
      lesson,
      status: progress[lesson.id] ?? 'LOCKED',
      x: ZIGZAG_POSITIONS[posIdx % 4],
      y: yOffset,
    });
    yOffset += NODE_SPACING_Y;
    posIdx++;

    // After lesson — insert exam node if applicable
    const exam = exams.find(e => e.unlockAfter === lesson.lessonNumber);
    if (exam) {
      const prereqLessons = lessons.filter(l => l.lessonNumber <= exam.unlockAfter);
      const examUnlocked  = prereqLessons.every(l => progress[l.id] === 'COMPLETED');
      nodes.push({
        id: exam.id,
        isExam: true,
        examType: exam.type,
        exam,
        status: examUnlocked ? 'EXAM' : 'EXAM_LOCKED',
        x: ZIGZAG_POSITIONS[posIdx % 4],
        y: yOffset,
      });
      yOffset += NODE_SPACING_Y + 30;
      posIdx++;
    }

    // Hidden level node if applicable
    const hidden = hiddenLevels.find(h => h.unlockBlockEnd === lesson.lessonNumber);
    if (hidden) {
      nodes.push({
        id: hidden.id,
        isExam: false,
        isHidden: true,
        hidden,
        status: hidden.completedAt ? 'COMPLETED' : 'AVAILABLE',
        x: ZIGZAG_POSITIONS[posIdx % 4],
        y: yOffset,
      });
      yOffset += NODE_SPACING_Y;
      posIdx++;
    }
  }

  return nodes;
}

// ── SVG path between nodes ────────────────────────────────────────────────────

type PathState = 'completed' | 'active' | 'locked';

function NodePath({ from, to, state }: {
  from: { x: number; y: number };
  to:   { x: number; y: number };
  state: PathState;
}) {
  const cx1 = from.x;
  const cy1 = from.y + 55;
  const cx2 = to.x;
  const cy2 = to.y - 55;
  const d = `M ${from.x} ${from.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x} ${to.y}`;

  if (state === 'completed') return (
    <>
      {/* Glow layer */}
      <path d={d} fill="none" stroke="rgba(0,225,171,0.2)" strokeWidth="6" strokeLinecap="round" />
      {/* Solid line */}
      <path d={d} fill="none" stroke="rgba(0,225,171,0.85)" strokeWidth="2.5" strokeLinecap="round" />
    </>
  );
  if (state === 'active') return (
    <path d={d} fill="none" stroke="rgba(0,225,171,0.4)" strokeWidth="2" strokeDasharray="8 5" strokeLinecap="round" />
  );
  return (
    <path d={d} fill="none" stroke="rgba(60,80,70,0.25)" strokeWidth="1.5" strokeDasharray="5 6" strokeLinecap="round" />
  );
}

// ── NodeCircle ────────────────────────────────────────────────────────────────

function NodeCircle({
  node,
  onClick,
}: {
  node: NodeInfo;
  onClick: () => void;
}) {
  const isCompleted  = node.status === 'COMPLETED';
  const isAvailable  = node.status === 'AVAILABLE' || node.status === 'IN_PROGRESS';
  const isLocked     = node.status === 'LOCKED';
  const isExamLocked = node.status === 'EXAM_LOCKED';
  const isExam       = node.isExam;
  const isHidden     = node.isHidden;

  const stateClass = isExamLocked
    ? 'av2-node--exam-locked'
    : isHidden
      ? 'av2-node--hidden'
      : isExam
        ? 'av2-node--exam'
        : isCompleted
          ? 'av2-node--done'
          : isAvailable
            ? 'av2-node--active'
            : 'av2-node--locked';

  const Icon = node.lesson ? (LESSON_TYPE_ICON[node.lesson.type] ?? BookOpen) : BookOpen;

  // Emoji for inside the circle
  const nodeEmoji = isCompleted
    ? '⭐'
    : isLocked || isExamLocked
      ? '🔒'
      : isExam
        ? '🏆'
        : isHidden
          ? '🌟'
          : (LESSON_EMOJI[node.lesson?.type ?? ''] ?? '📖');

  // Lesson number (only for regular lessons)
  const lessonNum = !isExam && !isHidden ? (node.lessonNumber ?? '') : null;

  // Short subtitle
  const TYPE_LABELS: Record<string, string> = {
    LESSON: 'Lección', SPEAKING: 'Hablar', LISTENING: 'Escuchar',
    PRACTICE: 'Práctica', REVIEW: 'Repaso',
  };
  const subtitle = isExam
    ? (node.examType === 'PRE_TEST' ? '📝 Evaluación' : node.examType === 'MIDTERM' ? '📊 Midterm' : '🏆 Final')
    : isHidden
      ? '✨ ¡Sorpresa!'
      : TYPE_LABELS[node.lesson?.type ?? ''] ?? 'Lección';

  // Status tag
  const tagLabel = isExamLocked
    ? '🔒 Bloqueado'
    : isExam
      ? null
      : isHidden
        ? '🌟 ¡Secreto!'
        : isCompleted
          ? '✅ ¡Hecho!'
          : isAvailable
            ? '🎯 ¡Tu turno!'
            : null;

  const tagClass = isExamLocked
    ? 'av2-node-tag av2-node-tag--locked'
    : isHidden
      ? 'av2-node-tag av2-node-tag--hidden'
      : isCompleted
        ? 'av2-node-tag av2-node-tag--done'
        : isAvailable
          ? 'av2-node-tag av2-node-tag--active'
          : '';

  return (
    <div
      className={`av2-node-wrap${isLocked || isExamLocked ? ' av2-node-wrap--locked' : ''}`}
      style={{ left: `${node.x}%`, top: `${node.y}px` }}
      onClick={() => !isLocked && !isExamLocked && onClick()}
    >
      {/* Status tag above */}
      <div className="av2-node-label-top">
        {tagLabel && <span className={tagClass}>{tagLabel}</span>}
      </div>

      {/* Circle + pulse together so pulse overlays the circle */}
      <div className="av2-circ-wrap">
        <div className={`av2-node-circle ${stateClass}`}>
          <span className="av2-node-emoji">{nodeEmoji}</span>
          {lessonNum !== null && <span className="av2-node-num">{lessonNum}</span>}
        </div>
        {isAvailable && !isExam && <div className="av2-node-pulse" />}
      </div>

      {/* Subtitle below */}
      <div className="av2-node-name">{subtitle}</div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function AdventureMode({ user }: { user: DemoUser }) {
  const [profile, setProfile] = useState<LangProfile | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [phaseHistory, setPhaseHistory] = useState<PhaseHistory[]>([]);
  const [progress, setProgress] = useState<Record<string, LessonStatus>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [savingLesson, setSavingLesson] = useState(false);
  const [view, setView] = useState<View>('dashboard');
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [activeExam, setActiveExam] = useState<Exam | null>(null);
  const [xpPopup, setXpPopup] = useState<{ amount: number; levelUp?: boolean } | null>(null);
  const [error, setError] = useState('');

  // Inject Google Fonts
  useEffect(() => {
    const id = 'av2-gfonts';
    if (!document.getElementById(id)) {
      const link = document.createElement('link');
      link.id = id;
      link.rel = 'stylesheet';
      link.href =
        'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700&family=Manrope:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap';
      document.head.appendChild(link);
    }
  }, []);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const dash = (await fetchLanguageDashboard(user.token)) as LangProfile | null;
      if (!dash) {
        setError('No se pudo cargar el perfil. Recarga la página.');
        setLoading(false);
        return;
      }
      setProfile(dash);
      const phases = Array.isArray(dash.phases) ? (dash.phases as PhaseHistory[]) : [];
      setPhaseHistory(phases);

      const phaseIdToLoad =
        dash.currentPhaseId ??
        phases.find(item => item.status === 'ACTIVE' || item.status === 'DRAFT')?.id ??
        phases[0]?.id ??
        null;

      if (phaseIdToLoad) {
        const ph = (await getAdventurePhase(phaseIdToLoad, user.token)) as Phase;
        if (ph) {
          setPhase(ph);
          const prog: Record<string, LessonStatus> = {};
          for (const lesson of ph.lessons ?? []) {
            prog[lesson.id] = (lesson.status as LessonStatus) ?? 'LOCKED';
          }
          setProgress(prog);
        }
      } else {
        setPhase(null);
        setProgress({});
      }
    } catch {
      setError('Error cargando perfil de aventura');
    }
    setLoading(false);
  }, [user.token]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleGeneratePhase() {
    setGenerating(true);
    setError('');
    try {
      const res = (await generateAdventurePhase(user.token)) as {
        phaseId: string;
        alreadyExisted: boolean;
        phase: Phase;
      };
      if (res?.phase) {
        setPhase(res.phase);
        const prog: Record<string, LessonStatus> = {};
        for (const lesson of res.phase.lessons ?? []) {
          prog[lesson.id] = (lesson.status as LessonStatus) ?? 'LOCKED';
        }
        setProgress(prog);
        setProfile(prev => (prev ? { ...prev, currentPhaseId: res.phaseId } : prev));
        const history = (await listAdventurePhases(user.token)) as PhaseHistory[];
        setPhaseHistory(Array.isArray(history) ? history : []);
      } else {
        await loadDashboard();
      }
    } catch {
      setError('Error generando fase. Intenta de nuevo.');
    }
    setGenerating(false);
  }

  async function handleOpenLesson(lesson: Lesson) {
    setProgress(prev => ({ ...prev, [lesson.id]: 'IN_PROGRESS' }));
    try {
      const res = (await startLesson(lesson.id, user.token)) as { content?: LessonContent };
      const enrichedLesson: Lesson = { ...lesson, content: res?.content ?? lesson.content };
      setActiveLesson(enrichedLesson);
      setView('lesson');
    } catch {
      setActiveLesson(lesson);
      setView('lesson');
    }
  }

  async function handleCompleteLesson(
    lessonId: string,
    result: { answers: Record<string, string>; hintsUsed: number },
  ) {
    setSavingLesson(true);
    setError('');
    try {
      const res = (await completeLesson(lessonId, result, user.token)) as {
        xpResult?: { xpAwarded: number; leveledUp: boolean; currentXp: number; currentLevel: number };
        passed?: boolean;
        nextLessonId?: string | null;
      };
      if (res?.xpResult?.xpAwarded && res.xpResult.xpAwarded > 0) {
        setXpPopup({ amount: res.xpResult.xpAwarded, levelUp: res.xpResult.leveledUp });
        setTimeout(() => setXpPopup(null), 3000);
      }
      await loadDashboard();
      setView('map');
      setActiveLesson(null);
    } catch {
      setError('No se pudo guardar la lección. Intenta de nuevo.');
    }
    setSavingLesson(false);
  }

  async function handleOpenExam(exam: Exam) {
    const full = (await getAdventureExam(exam.id, user.token)) as Exam;
    setActiveExam(full);
    setView('exam');
  }

  async function handleSubmitExam(examId: string, answers: Record<string, string>, score: number) {
    const res = (await submitExamAttempt(examId, { answers }, user.token)) as {
      xpResult?: { xpAwarded: number; leveledUp: boolean };
    };
    if (res?.xpResult?.xpAwarded && res.xpResult.xpAwarded > 0) {
      setXpPopup({ amount: res.xpResult.xpAwarded, levelUp: res.xpResult.leveledUp });
      setTimeout(() => setXpPopup(null), 3000);
    }
    setView('map');
    setActiveExam(null);
    await loadDashboard();
  }

  async function handleOpenPhaseFromHistory(phaseId: string) {
    setLoading(true);
    setError('');
    try {
      const ph = (await getAdventurePhase(phaseId, user.token)) as Phase;
      if (ph) {
        setPhase(ph);
        const prog: Record<string, LessonStatus> = {};
        for (const lesson of ph.lessons ?? []) {
          prog[lesson.id] = (lesson.status as LessonStatus) ?? 'LOCKED';
        }
        setProgress(prog);
        setView('map');
      }
    } catch {
      setError('No se pudo cargar el historial de la fase.');
    }
    setLoading(false);
  }

  // ── Render: loading ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="av2-boot">
        <div className="av2-boot-ring" />
        <span className="av2-boot-text">Preparando tu aventura... 🌟</span>
      </div>
    );
  }

  // ── Render: lesson player ───────────────────────────────────────────────────
  if (view === 'lesson' && activeLesson) {
    return (
      <LessonPlayer
        lesson={activeLesson}
        onComplete={handleCompleteLesson}
        saving={savingLesson}
        onBack={() => {
          if (savingLesson) return;
          setView('map');
          setActiveLesson(null);
        }}
      />
    );
  }

  // ── Render: exam player ─────────────────────────────────────────────────────
  if (view === 'exam' && activeExam) {
    return (
      <ExamPlayer
        exam={activeExam}
        onSubmit={handleSubmitExam}
        onBack={() => {
          setView('map');
          setActiveExam(null);
        }}
      />
    );
  }

  // ── Computed values ─────────────────────────────────────────────────────────
  const selectedTitle = profile?.titles?.find(t => t.title.id === profile.selectedTitleId)?.title;
  const completedCount = Object.values(progress).filter(s => s === 'COMPLETED').length;
  const totalCount = phase ? phase.lessons.length : 0;
  const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const streak = 0; // placeholder — no streak data in current API

  // ── Shared HUD ──────────────────────────────────────────────────────────────
  const currentLevel = profile?.currentLevel ?? 1;
  const currentXp    = profile?.currentXp ?? 0;
  const xpNeeded     = xpForLevel(currentLevel);
  const xpPct        = Math.min(100, Math.round((currentXp / xpNeeded) * 100));
  const xpLeft       = xpNeeded - currentXp;
  const tier         = getTierIcon(currentLevel);

  const hud = (
    <header className="av2-hud">
      {/* Left: phase title + level + XP bar */}
      <div className="av2-hud-left">
        <div className="av2-hud-phase-title">
          🗺️ {phase ? phase.topic : 'Mi Aventura'}
          {phase && <span className="av2-hud-cefr">{phase.cefrLevel}</span>}
        </div>
        <div className="av2-hud-progress-row">
          <span className="av2-hud-lv">⭐ {currentLevel}</span>
          <div className="av2-hud-xpbar">
            <div className="av2-hud-xpbar-fill" style={{ width: `${xpPct}%` }} />
          </div>
          <span className="av2-hud-xp-txt">
            {currentXp} XP
            <span className="av2-hud-xp-left"> · {xpLeft} para ⭐{currentLevel + 1}</span>
          </span>
        </div>
      </div>

      {/* Right: tier icon + name */}
      <div className="av2-hud-right">
        <div className={`av2-tier-badge ${tier.cls}`} title={tier.label}>
          {tier.icon}
          <span className="av2-tier-label">{tier.label}</span>
        </div>
        <span className="av2-user-name">👋 {user.name.split(' ')[0]}</span>
      </div>
    </header>
  );

  // ── No phase yet ────────────────────────────────────────────────────────────
  if (!phase) {
    return (
      <div className="av2-root">
        {hud}
        <div className="av2-init-screen">
          <div className="av2-init-glyph">🗺️</div>
          <h2 className="av2-init-title">¡Listo para explorar!</h2>
          <p className="av2-init-sub">ACoreAI preparará tu camino de aprendizaje personalizado 🌟</p>
          {error && <span className="av2-init-error">{error}</span>}
          <button className="av2-init-btn" onClick={handleGeneratePhase} disabled={generating}>
            {generating ? '✨ Preparando tu mapa...' : '🚀 ¡Comenzar aventura!'}
          </button>
          {phaseHistory.length > 0 && (
            <div className="av2-feedback-tips" style={{ marginTop: 20 }}>
              {phaseHistory.map(item => (
                <button
                  key={item.id}
                  className="av2-feedback-tip"
                  style={{ textAlign: 'left', cursor: 'pointer' }}
                  onClick={() => handleOpenPhaseFromHistory(item.id)}
                >
                  Fase {item.phaseNumber} · {item.topic} · {item.status}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Build node list ─────────────────────────────────────────────────────────
  const nodes = computeNodePositions(
    phase.lessons,
    phase.exams ?? [],
    phase.hiddenLevels ?? [],
    progress,
  );

  const totalHeight = nodes.length > 0 ? nodes[nodes.length - 1].y + 160 : 600;

  // ── Map view ────────────────────────────────────────────────────────────────
  return (
    <div className="av2-root">
      {hud}

      {/* Map canvas */}
      <div className="av2-map-wrap">
        <div className="av2-map-canvas" style={{ height: totalHeight }}>
          {/* SVG paths (solid for completed, dashed for active/locked) */}
          <svg
            className="av2-svg-paths"
            viewBox={`0 0 100 ${totalHeight}`}
            preserveAspectRatio="none"
          >
            {nodes.slice(0, -1).map((node, i) => {
              const next = nodes[i + 1];
              const fromDone = node.status === 'COMPLETED';
              const toDone   = next.status === 'COMPLETED';
              const toActive = next.status === 'AVAILABLE' || next.status === 'IN_PROGRESS';
              const pathState: PathState = fromDone && toDone
                ? 'completed'
                : fromDone && toActive
                  ? 'active'
                  : 'locked';
              return (
                <NodePath
                  key={`path-${node.id}`}
                  from={{ x: node.x, y: node.y }}
                  to={{ x: next.x, y: next.y }}
                  state={pathState}
                />
              );
            })}
          </svg>

          {/* Sector chapter banners */}
          {([
            { label: 'Capítulo 1', icon: '🌱', desc: 'Primeros pasos',     color: '#00e1ab', lessons: [1, 10]  },
            { label: 'Capítulo 2', icon: '⚡', desc: '¡Tomando vuelo!',    color: '#fbbf24', lessons: [11, 20] },
            { label: 'Capítulo 3', icon: '🏆', desc: '¡Nivel experto!',    color: '#a78bfa', lessons: [21, 30] },
          ]).map((sector, si) => {
            const sectorNode = nodes.find(n => !n.isExam && !n.isHidden && n.lessonNumber === sector.lessons[0]);
            if (!sectorNode) return null;
            return (
              <div
                key={si}
                className="av2-sector-banner"
                style={{ top: sectorNode.y - 135, '--sc': sector.color } as React.CSSProperties}
              >
                <span className="av2-sector-icon">{sector.icon}</span>
                <div className="av2-sector-texts">
                  <span className="av2-sector-name">{sector.label}</span>
                  <span className="av2-sector-desc">{sector.desc}</span>
                </div>
                <span className="av2-sector-range">L{sector.lessons[0]}–{sector.lessons[1]}</span>
              </div>
            );
          })}

          {/* Render all nodes */}
          {nodes.map(node => (
            <NodeCircle
              key={node.id}
              node={node}
              onClick={() => {
                if (node.isExam && node.exam) {
                  handleOpenExam(node.exam);
                } else if (node.isHidden && node.hidden) {
                  if (!node.hidden.completedAt) {
                    completeHiddenLevel(node.hidden.id, user.token).then(() => loadDashboard());
                  }
                } else if (node.lesson) {
                  handleOpenLesson(node.lesson);
                }
              }}
            />
          ))}
        </div>
      </div>

      {/* Bottom-left progress card */}
      <div className="av2-progress-card">
        <div className="av2-pc-icon">{progressPct < 34 ? '🌱' : progressPct < 67 ? '⭐' : '🏆'}</div>
        <div className="av2-pc-info">
          <div className="av2-pc-header">
            <span className="av2-pc-title">Mi Aventura 🗺️</span>
            <span className="av2-pc-badge">{completedCount}/{totalCount}</span>
          </div>
          <div className="av2-pc-bar">
            <div className="av2-pc-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="av2-pc-pct">{progressPct}% completado ✨</span>
        </div>
      </div>

      {phaseHistory.length > 0 && (
        <div className="av2-progress-card" style={{ bottom: 124 }}>
          <div className="av2-pc-icon">🗂️</div>
          <div className="av2-pc-info">
            <div className="av2-pc-header">
              <span className="av2-pc-title">Historial</span>
              <span className="av2-pc-badge">{phaseHistory.length}</span>
            </div>
            <div style={{ display: 'grid', gap: 6, marginTop: 8 }}>
              {phaseHistory.slice(0, 3).map(item => (
                <button
                  key={item.id}
                  className="av2-feedback-tip"
                  style={{ textAlign: 'left', cursor: 'pointer', margin: 0 }}
                  onClick={() => handleOpenPhaseFromHistory(item.id)}
                >
                  Fase {item.phaseNumber} · {item.topic}
                </button>
              ))}
              {!profile?.currentPhaseId && (
                <button
                  className="av2-feedback-tip"
                  style={{ textAlign: 'left', cursor: 'pointer', margin: 0 }}
                  onClick={handleGeneratePhase}
                >
                  + Generar siguiente fase
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bottom-right zoom (decorative) */}
      <div className="av2-zoom">
        <button className="av2-zoom-btn">+</button>
        <button className="av2-zoom-btn">−</button>
      </div>

      {/* XP popup */}
      {xpPopup && (
        <div className={`av2-xp-popup${xpPopup.levelUp ? ' av2-xp-popup--levelup' : ''}`}>
          {xpPopup.levelUp
            ? `🎉 ¡SUBISTE DE NIVEL! ✨ +${xpPopup.amount} XP 🎊`
            : `✨ +${xpPopup.amount} XP ¡Genial!`}
        </div>
      )}

      {/* Generating overlay */}
      {generating && (
        <div className="av2-generating">
          <div className="av2-generating-ring" />
          <span className="av2-generating-text">✨ Creando tu aventura...</span>
        </div>
      )}
    </div>
  );
}

// ── ACoreAI character helper ───────────────────────────────────────────────────

type ACoreAIGesture = 'hola' | 'indicating' | 'idea' | 'studing' | 'heart' | 'nopasa';

const ACOREAI_IMG: Record<ACoreAIGesture, string | undefined> = {
  hola: acoreaiHola,
  indicating: acoreaiIndicating,
  idea: acoreaiIdea,
  studing: acoreaiStuding,
  heart: acoreaiHeart,
  nopasa: acoreaiNopasa,
};

const ACOREAI_MESSAGES: Record<ACoreAIGesture, string[]> = {
  hola: ['¡Vamos a comenzar!', '¡Hola! Estoy lista para enseñarte.'],
  indicating: ['Presta atención a esto.', 'Aquí va la explicación.', 'Esto es importante.'],
  idea: ['Objetivo de hoy:', 'Esto es lo que aprenderás:', 'Concepto clave:'],
  studing: ['Repasa el vocabulario.', 'Estos son los términos clave.', 'Aprende bien estas palabras.'],
  heart: ['¡Correcto! ¡Excelente!', '¡Muy bien! ¡Sigue así!', '¡Perfecto!', '¡Lo lograste!'],
  nopasa: ['No pasa nada, intenta de nuevo.', 'Casi, la respuesta correcta era otra.', 'Sigue practicando.'],
};

function getRandomMsg(gesture: ACoreAIGesture): string {
  const msgs = ACOREAI_MESSAGES[gesture];
  return msgs[Math.floor(Math.random() * msgs.length)];
}

function ACoreAIPanel({ gesture }: { gesture: ACoreAIGesture }) {
  const [msg] = useState(() => getRandomMsg(gesture));
  return (
    <div className={`al-panel al-panel--${gesture}`}>
      <img src={ACOREAI_IMG[gesture]} alt="ACoreAI" className="al-img" />
      <div className="al-bubble">{msg}</div>
    </div>
  );
}

// ── Vocab flashcard constants ─────────────────────────────────────────────────

const CARD_PALETTE = [
  { bg: 'rgba(0,225,171,0.07)', border: 'rgba(0,225,171,0.25)', glow: 'rgba(0,225,171,0.12)', icon: '🌟' },
  { bg: 'rgba(119,39,255,0.07)', border: 'rgba(119,39,255,0.25)', glow: 'rgba(119,39,255,0.1)', icon: '⚡' },
  { bg: 'rgba(245,158,11,0.07)', border: 'rgba(245,158,11,0.25)', glow: 'rgba(245,158,11,0.1)', icon: '🔑' },
  { bg: 'rgba(96,165,250,0.07)', border: 'rgba(96,165,250,0.25)', glow: 'rgba(96,165,250,0.1)', icon: '💡' },
  { bg: 'rgba(239,68,68,0.07)',  border: 'rgba(239,68,68,0.25)',  glow: 'rgba(239,68,68,0.1)',  icon: '🎯' },
] as const;

// ── LessonPlayer ──────────────────────────────────────────────────────────────

function LessonPlayer({
  lesson,
  onComplete,
  saving,
  onBack,
}: {
  lesson: Lesson;
  onComplete: (lessonId: string, result: { answers: Record<string, string>; hintsUsed: number }) => Promise<void>;
  saving: boolean;
  onBack: () => void;
}) {
  const [step, setStep] = useState<'intro' | 'vocab' | 'practice' | 'done'>('intro');
  const [practiceIdx, setPracticeIdx] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [openAnswer, setOpenAnswer] = useState('');
  const [errors, setErrors] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [autoSubmitted, setAutoSubmitted] = useState(false);

  // Vocab flashcard state
  const [vocabIdx, setVocabIdx] = useState(0);
  const [vocabFlipped, setVocabFlipped] = useState(false);
  const [vocabSeen, setVocabSeen] = useState<Set<number>>(new Set());

  // Streak counter
  const [streak, setStreak] = useState(0);

  const practice = lesson.content?.practice ?? [];
  const vocab = lesson.content?.vocabulary ?? [];
  const currentQ = practice[practiceIdx];
  const isLastQ = practiceIdx + 1 >= practice.length;

  // ACoreAI gesture based on current state
  const gesture: ACoreAIGesture =
    step === 'done' ? 'hola'
    : step === 'vocab' ? 'studing'
    : feedback === 'correct' ? 'heart'
    : feedback === 'wrong' ? 'nopasa'
    : step === 'intro' ? 'idea'
    : 'indicating';

  function handleAnswer(option: string) {
    if (feedback) return;
    setSelected(option);
    setAnswers(prev => ({ ...prev, [String(practiceIdx)]: option }));
    const isCorrect = isCorrectQuestionAnswer(currentQ, option);
    setFeedback(isCorrect ? 'correct' : 'wrong');
    if (isCorrect) { setCorrect(c => c + 1); setStreak(s => s + 1); }
    else           { setErrors(e => e + 1);  setStreak(0); }
  }

  function handleNext() {
    setFeedback(null);
    setSelected(null);
    setOpenAnswer('');
    if (isLastQ) setStep('done');
    else setPracticeIdx(i => i + 1);
  }

  // Progress bar (steps: intro=0, vocab=1, practice=2+idx, done=last)
  const totalSteps = 2 + practice.length;
  const currentStep = step === 'intro' ? 0 : step === 'vocab' ? 1 : step === 'done' ? totalSteps : 2 + practiceIdx;
  const progressPct = Math.round((currentStep / Math.max(totalSteps, 1)) * 100);
  const totalPractice = practice.length || 1;
  const passThreshold = lesson.content?.passThreshold ?? 3;
  const passedLesson = correct >= passThreshold;
  const wrongQuestions = practice
    .map((question, index) => ({
      question,
      answer: answers[String(index)] ?? '',
      index,
    }))
    .filter(item => item.answer && !isCorrectQuestionAnswer(item.question, item.answer));

  useEffect(() => {
    if (step !== 'done' || autoSubmitted) return;
    setAutoSubmitted(true);
    void onComplete(lesson.id, { answers, hintsUsed: 0 });
  }, [answers, autoSubmitted, lesson.id, onComplete, step]);

  return (
    <div className="av2-player">
      {/* Header */}
      <div className="av2-player-header">
        <button className="av2-back-btn" onClick={onBack} disabled={saving}>
          {saving ? <Loader2 size={14} /> : <ArrowLeft size={14} />} {saving ? 'GUARDANDO' : 'VOLVER'}
        </button>
        <div className="av2-player-header-center">
          <div className="av2-player-prog-bar">
            <div className="av2-player-prog-fill" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
        <span className="av2-player-progress">
          {step === 'practice' ? `${practiceIdx + 1}/${practice.length}` : step === 'done' ? '✓' : step === 'vocab' ? 'VOC' : 'INTRO'}
        </span>
      </div>

      {/* Main layout: ACoreAI + Content */}
      <div className="av2-lesson-layout">
        {/* ACoreAI character (left / top) */}
        <ACoreAIPanel key={`${gesture}-${practiceIdx}`} gesture={gesture} />

        {/* Content area */}
        <div className="av2-lesson-content">

          {/* STEP: INTRO */}
          {step === 'intro' && (
            <div className="av2-lc-body">
              <h3 className="av2-lc-title">{lesson.title}</h3>
              <div className="av2-lesson-objective">{lesson.objective}</div>
              {lesson.content?.grammar && (
                <div className="av2-lesson-grammar">{lesson.content.grammar}</div>
              )}
              <div className="av2-lesson-intro">{lesson.content?.intro || 'Cargando contenido...'}</div>
              <div className="av2-lc-actions">
                {vocab.length > 0 ? (
                  <button className="av2-cta-btn" onClick={() => setStep('vocab')}>
                    Ver vocabulario <ChevronRight size={14} />
                  </button>
                ) : practice.length > 0 ? (
                  <button className="av2-cta-btn" onClick={() => setStep('practice')}>
                    EMPEZAR PRÁCTICA <ChevronRight size={14} />
                  </button>
                ) : (
                  <button className="av2-cta-btn" onClick={() => setStep('done')}>
                    COMPLETAR <CheckCircle2 size={14} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP: VOCABULARY — interactive flashcards */}
          {step === 'vocab' && vocab.length > 0 && (() => {
            const card = vocab[vocabIdx];
            const palette = CARD_PALETTE[vocabIdx % CARD_PALETTE.length];
            const allSeen = vocabSeen.size >= vocab.length || (vocabSeen.size === vocab.length - 1 && vocabSeen.has(vocabIdx) === false && vocabFlipped);
            const isLast = vocabIdx === vocab.length - 1;

            function flipCard() {
              setVocabFlipped(f => !f);
              setVocabSeen(s => new Set([...s, vocabIdx]));
            }

            function goTo(idx: number) {
              setVocabIdx(idx);
              setVocabFlipped(false);
            }

            function goNext() {
              setVocabSeen(s => new Set([...s, vocabIdx]));
              goTo(vocabIdx + 1);
            }

            return (
              <div className="av2-lc-body av2-vc-body">
                {/* Header */}
                <div className="av2-vc-header">
                  <span className="av2-vc-label">Vocabulario</span>
                  <span className="av2-vc-counter">{vocabIdx + 1} <span className="av2-vc-counter-sep">/</span> {vocab.length}</span>
                </div>

                {/* Flip card */}
                <div
                  className={`av2-vc-flip${vocabFlipped ? ' av2-vc-flip--flipped' : ''}`}
                  style={{ '--vc-bg': palette.bg, '--vc-border': palette.border, '--vc-glow': palette.glow } as React.CSSProperties}
                  onClick={flipCard}
                  role="button"
                  aria-label="Voltear tarjeta"
                >
                  <div className="av2-vc-inner">
                    {/* FRONT: English word */}
                    <div className="av2-vc-face av2-vc-front">
                      <div className="av2-vc-card-icon">{palette.icon}</div>
                      <div className="av2-vc-word">{card.term}</div>
                      <div className="av2-vc-tap-hint">
                        <span className="av2-vc-tap-dot" />
                        toca para ver el significado
                      </div>
                    </div>
                    {/* BACK: Spanish meaning + example */}
                    <div className="av2-vc-face av2-vc-back">
                      <div className="av2-vc-meaning-label">en español</div>
                      <div className="av2-vc-meaning">{card.meaningEs}</div>
                      <div className="av2-vc-divider" />
                      <div className="av2-vc-example-label">ejemplo</div>
                      <div className="av2-vc-example">"{card.example}"</div>
                    </div>
                  </div>
                </div>

                {/* Progress dots */}
                <div className="av2-vc-dots">
                  {vocab.map((_, i) => (
                    <button
                      key={i}
                      className={`av2-vc-dot${i === vocabIdx ? ' av2-vc-dot--active' : ''}${vocabSeen.has(i) ? ' av2-vc-dot--seen' : ''}`}
                      onClick={e => { e.stopPropagation(); goTo(i); }}
                      aria-label={`Palabra ${i + 1}`}
                    />
                  ))}
                </div>

                {/* Navigation */}
                <div className="av2-vc-nav">
                  <button
                    className="av2-vc-nav-btn"
                    disabled={vocabIdx === 0}
                    onClick={() => goTo(vocabIdx - 1)}
                  >
                    ← Anterior
                  </button>

                  {!isLast ? (
                    <button className="av2-vc-nav-btn av2-vc-nav-btn--next" onClick={goNext}>
                      Siguiente →
                    </button>
                  ) : (allSeen || vocabSeen.size >= vocab.length - 1) ? (
                    practice.length > 0 ? (
                      <button className="av2-cta-btn" onClick={() => setStep('practice')}>
                        ¡A practicar! <ChevronRight size={14} />
                      </button>
                    ) : (
                      <button className="av2-cta-btn" onClick={() => setStep('done')}>
                        Completar <CheckCircle2 size={14} />
                      </button>
                    )
                  ) : (
                    <button className="av2-vc-nav-btn av2-vc-nav-btn--hint" disabled>
                      Revisa todas las tarjetas
                    </button>
                  )}
                </div>
              </div>
            );
          })()}

          {/* STEP: PRACTICE */}
          {step === 'practice' && currentQ && (
            <div className="av2-lc-body av2-pq-body">

              {/* Top bar: segmented progress + streak */}
              <div className="av2-pq-topbar">
                <div className="av2-pq-track">
                  {practice.map((_, i) => (
                    <div
                      key={i}
                      className={`av2-pq-seg${i < practiceIdx ? ' av2-pq-seg--done' : i === practiceIdx ? ' av2-pq-seg--cur' : ''}`}
                    />
                  ))}
                </div>
                {streak >= 2 && (
                  <div className="av2-pq-streak">🔥 {streak}</div>
                )}
              </div>

              {/* Question card */}
              <div
                key={`qcard-${practiceIdx}`}
                className={`av2-pq-card${feedback === 'correct' ? ' av2-pq-card--ok' : feedback === 'wrong' ? ' av2-pq-card--fail' : ''}`}
              >
                <div className="av2-pq-card-top">
                  <span className="av2-pq-num">{practiceIdx + 1}</span>
                  <span className="av2-pq-type-badge">
                    {currentQ.options?.length ? 'Elige la correcta' : 'Escribe la respuesta'}
                  </span>
                </div>
                <div className="av2-pq-text">{currentQ.question}</div>
              </div>

              {/* MCQ options */}
              {currentQ.options && currentQ.options.length > 0 && (
                <div className="av2-pq-opts" key={`opts-${practiceIdx}`}>
                  {currentQ.options.map((opt, i) => {
                    const letter = (['a', 'b', 'c', 'd'] as const)[i] ?? 'a';
                    const isSelected = selected === opt;
                    const isAnswer = opt.trim().toLowerCase() === currentQ.answer.trim().toLowerCase();
                    const revealCorrect = isAnswer && feedback === 'wrong';
                    const state = feedback
                      ? isSelected && feedback === 'correct' ? ' av2-pq-opt--ok'
                      : isSelected && feedback === 'wrong'   ? ' av2-pq-opt--fail'
                      : revealCorrect                        ? ' av2-pq-opt--reveal'
                      :                                        ' av2-pq-opt--dim'
                      : '';
                    return (
                      <button
                        key={i}
                        className={`av2-pq-opt av2-pq-opt--${letter}${state}`}
                        onClick={() => handleAnswer(opt)}
                        disabled={!!feedback}
                      >
                        <span className="av2-pq-opt-badge">{String.fromCharCode(65 + i)}</span>
                        <span className="av2-pq-opt-text">{opt}</span>
                        {isSelected && feedback === 'correct' && <span className="av2-pq-mark av2-pq-mark--ok">✓</span>}
                        {isSelected && feedback === 'wrong'   && <span className="av2-pq-mark av2-pq-mark--fail">✗</span>}
                        {revealCorrect                         && <span className="av2-pq-mark av2-pq-mark--ok">✓</span>}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Open text input */}
              {(!currentQ.options || currentQ.options.length === 0) && (
                <div className="av2-pq-open">
                  <input
                    className="av2-pq-input"
                    placeholder="Escribe tu respuesta aquí..."
                    value={openAnswer}
                    onChange={e => setOpenAnswer(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !feedback && handleAnswer(openAnswer)}
                    disabled={!!feedback}
                    autoFocus
                  />
                  {!feedback && (
                    <button className="av2-cta-btn" onClick={() => handleAnswer(openAnswer)}>
                      VERIFICAR
                    </button>
                  )}
                </div>
              )}

              {/* Feedback row */}
              {feedback && (
                <div className={`av2-pq-fb av2-pq-fb--${feedback}`}>
                  <span className="av2-pq-fb-icon">{feedback === 'correct' ? '🎉' : '💪'}</span>
                  <div className="av2-pq-fb-body">
                    <div className="av2-pq-fb-title">
                      {feedback === 'correct' ? '¡Correcto!' : 'Casi lo tienes'}
                    </div>
                    {feedback === 'wrong' && (
                      <div className="av2-pq-fb-sub">Respuesta: "{currentQ.answer}"</div>
                    )}
                  </div>
                  {feedback === 'correct' && <span className="av2-pq-xp">+10 XP</span>}
                </div>
              )}

              {/* Next button */}
              {feedback && (
                <button className="av2-pq-next" onClick={handleNext}>
                  {isLastQ ? '🏁 Ver mi resultado' : 'Siguiente pregunta →'}
                </button>
              )}

            </div>
          )}

          {/* STEP: DONE */}
          {step === 'done' && (
            <div className="av2-lc-body av2-done">
              <div className="av2-done-title">¡Lección completada!</div>
              <div className="av2-done-score-wrap">
                <div className={`av2-score-ring${passedLesson ? ' av2-score-ring--pass' : ' av2-score-ring--fail'}`}>
                  {Math.round((correct / totalPractice) * 100)}%
                </div>
                <div className="av2-done-sub">
                  {correct} de {practice.length} correctas. Necesitas {passThreshold} para aprobar.
                </div>
              </div>
              {wrongQuestions.length > 0 && (
                <div className="av2-feedback-tips">
                  {wrongQuestions.map(item => (
                    <div key={item.index} className="av2-feedback-tip">
                      {item.question.explanationEs ?? `Respuesta correcta: ${item.question.answer}`}
                    </div>
                  ))}
                </div>
              )}
              {lesson.content?.feedbackRules && lesson.content.feedbackRules.length > 0 && (
                <div className="av2-feedback-tips">
                  {lesson.content.feedbackRules.map((r, i) => (
                    <div key={i} className="av2-feedback-tip">💡 {r}</div>
                  ))}
                </div>
              )}
              <div className="av2-lc-actions">
                <div className="av2-done-sub">
                  {saving
                    ? (passedLesson
                      ? 'Guardando la leccion, desbloqueando la siguiente y aplicando XP...'
                      : 'Guardando el intento automaticamente...')
                    : 'Resultado sincronizado.'}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── ExamPlayer ────────────────────────────────────────────────────────────────

function ExamPlayer({
  exam,
  onSubmit,
  onBack,
}: {
  exam: Exam;
  onSubmit: (examId: string, answers: Record<string, string>, score: number) => void;
  onBack: () => void;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [qIdx, setQIdx] = useState(0);

  const questions = exam.questions ?? [];
  const currentQ = questions[qIdx];
  const totalQ = questions.length;

  function selectAnswer(questionIdx: number, answer: string) {
    setAnswers(prev => ({ ...prev, [String(questionIdx)]: answer }));
  }

  function handleSubmit() {
    let correctCount = 0;
    questions.forEach((q, i) => {
      if (answers[String(i)] === q.answer) correctCount++;
    });
    const s = totalQ > 0 ? Math.round((correctCount / totalQ) * 100) : 100;
    setScore(s);
    setSubmitted(true);
  }

  if (submitted) {
    const passed = score >= 80;
    return (
      <div className="av2-player">
        <div className="av2-player-header">
          <span className="av2-player-title">{exam.title}</span>
        </div>
        <div className="av2-player-body av2-done">
          <div className="av2-done-glyph">{passed ? '🏆' : '😤'}</div>
          <div className="av2-done-title">{passed ? '¡Aprobado!' : 'No aprobado'}</div>
          <div className={`av2-score-ring${passed ? ' av2-score-ring--pass' : ' av2-score-ring--fail'}`}>
            {score}%
          </div>
          <div className="av2-done-sub">
            {passed ? 'Ganaste 20 XP' : score < 80 ? 'Necesitas 80% para pasar' : ''}
          </div>
          <button className="av2-cta-btn" onClick={() => onSubmit(exam.id, answers, score)}>
            {passed ? 'CONTINUAR AVENTURA' : 'VER RESULTADOS'} <ChevronRight size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="av2-player">
      <div className="av2-player-header">
        <button className="av2-back-btn" onClick={onBack}>
          <ArrowLeft size={14} /> VOLVER
        </button>
        <span className="av2-player-title">{exam.title}</span>
        <span className="av2-player-progress">
          {qIdx + 1}/{totalQ}
        </span>
      </div>
      <div className="av2-player-body">
        {currentQ && (
          <>
            <div className="av2-exam-question">{currentQ.question}</div>
            {currentQ.options ? (
              <div className="av2-practice-options">
                {currentQ.options.map((opt, i) => (
                  <button
                    key={i}
                    className={`av2-option${answers[String(qIdx)] === opt ? ' av2-option--selected' : ''}`}
                    onClick={() => selectAnswer(qIdx, opt)}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            ) : (
              <input
                className="av2-open-input"
                placeholder="Tu respuesta..."
                value={answers[String(qIdx)] ?? ''}
                onChange={e => selectAnswer(qIdx, e.target.value)}
              />
            )}
            <div className="av2-exam-nav">
              {qIdx > 0 && (
                <button className="av2-nav-btn" onClick={() => setQIdx(i => i - 1)}>
                  ← ANTERIOR
                </button>
              )}
              {qIdx + 1 < totalQ ? (
                <button className="av2-nav-btn av2-nav-btn--next" onClick={() => setQIdx(i => i + 1)}>
                  SIGUIENTE →
                </button>
              ) : (
                <button className="av2-cta-btn" onClick={handleSubmit}>
                  ENVIAR EXAMEN <Trophy size={14} />
                </button>
              )}
            </div>
          </>
        )}
        {totalQ === 0 && (
          <div className="av2-done">
            <div className="av2-done-sub">Examen sin preguntas disponibles.</div>
            <button className="av2-cta-btn" onClick={() => onSubmit(exam.id, {}, 100)}>
              COMPLETAR <CheckCircle2 size={14} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
