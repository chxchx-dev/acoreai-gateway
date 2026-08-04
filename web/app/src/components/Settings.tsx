import { FormEvent, useState } from 'react';
import {
  ArrowLeft,
  BarChart2,
  Check,
  ChevronRight,
  CreditCard,
  HelpCircle,
  LogOut,
  MessageSquare,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Sun,
  User,
  X,
  Zap,
} from 'lucide-react';
import { PLAN_LABELS, type DemoUser, type UserRole } from '../lib/auth';

type View = 'home' | 'plans' | 'usage' | 'billing' | 'about';

const PLANS: {
  role: UserRole;
  label: string;
  subtitle: string;
  color: string;
  dailyLimit: number | null;
  features: string[];
}[] = [
  {
    role: 'FREE',
    label: 'Free',
    subtitle: 'Para comenzar',
    color: 'var(--muted)',
    dailyLimit: 20,
    features: [
      'Explora básico',
      '20 consultas por día',
      'Traducción a 1 idioma',
      'Historial de 7 días',
    ],
  },
  {
    role: 'ACADEMIC',
    label: 'Académico',
    subtitle: 'Para instituciones ACOREAI',
    color: 'var(--accent)',
    dailyLimit: 100,
    features: [
      'Todo lo de Free',
      '100 consultas por día',
      'Todos los idiomas',
      'Voz: lectura en voz alta (TTS)',
      'Voz: dictado por micrófono (STT)',
      'Historial de 30 días',
    ],
  },
  {
    role: 'PLUS',
    label: 'Plus',
    subtitle: 'Sin límites',
    color: 'var(--accent-3)',
    dailyLimit: null,
    features: [
      'Todo lo de Académico',
      'Consultas ilimitadas',
      'Modelos avanzados',
      'Historial permanente',
      'Soporte prioritario',
    ],
  },
];

const USAGE_BY_PLAN: Record<
  UserRole,
  { used: number; limit: number | null; historyDays: number | null }
> = {
  FREE:     { used: 8,  limit: 20,   historyDays: 7 },
  ACADEMIC: { used: 34, limit: 100,  historyDays: 30 },
  PLUS:     { used: 91, limit: null, historyDays: null },
  ADMIN:    { used: 0,  limit: null, historyDays: null },
};

type SettingsProps = {
  open: boolean;
  onClose: () => void;
  user: DemoUser;
  theme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
  onNameChange: (name: string) => void;
  onLogout: () => void;
  chatMode?: 'general' | 'perspectivas' | 'rag';
  onChatModeChange?: (m: 'general' | 'perspectivas' | 'rag') => void;
};

function userInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('');
}

export function Settings({
  open,
  onClose,
  user,
  theme,
  onThemeChange,
  onNameChange,
  onLogout,
  chatMode = 'general',
  onChatModeChange,
}: SettingsProps) {
  const [view, setView] = useState<View>('home');
  const [draftName, setDraftName] = useState(user.name);
  const [nameSaved, setNameSaved] = useState(false);

  const currentPlan = PLANS.find((p) => p.role === user.role);
  const usage = USAGE_BY_PLAN[user.role] ?? USAGE_BY_PLAN.FREE;

  function saveName(e: FormEvent) {
    e.preventDefault();
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === user.name) return;
    onNameChange(trimmed);
    setNameSaved(true);
    window.setTimeout(() => setNameSaved(false), 1800);
  }

  function handleClose() {
    setView('home');
    onClose();
  }

  const subpageTitles: Record<Exclude<View, 'home'>, string> = {
    plans:   'Planes',
    usage:   'Mi uso',
    billing: 'Facturación',
    about:   'Acerca de',
  };

  return (
    <div className={`settings-modal ${open ? 'open' : ''}`}>
        {/* Header */}
        <div className="settings-header">
          <div className="settings-header-left">
            {view !== 'home' ? (
              <button
                className="icon-button"
                onClick={() => setView('home')}
                aria-label="Volver"
              >
                <ArrowLeft size={18} />
              </button>
            ) : (
              <SettingsIcon size={17} className="settings-header-icon" />
            )}
            <span className="settings-header-title">
              {view === 'home' ? 'Configuración' : subpageTitles[view]}
            </span>
          </div>
          <button className="icon-button" onClick={handleClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="settings-body">

          {/* ── Home ──────────────────────────────────────────────── */}
          {view === 'home' && (
            <>
              {/* Perfil */}
              <div className="sg-group">
                <div className="sg-item sg-profile">
                  <div className="sg-avatar">{userInitials(user.name)}</div>
                  <div className="sg-profile-text">
                    <strong>{user.name}</strong>
                    <span
                      className="plan-chip"
                      style={{ '--chip-color': currentPlan?.color ?? 'var(--muted)' } as React.CSSProperties}
                    >
                      {PLAN_LABELS[user.role] ?? user.role}
                    </span>
                  </div>
                </div>

                <div className="sg-item sg-name-row">
                  <form className="sg-name-form" onSubmit={saveName}>
                    <span className="sg-field-label">Nombre</span>
                    <div className="sg-input-wrap">
                      <input
                        className="sg-input"
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        placeholder="Tu nombre"
                        maxLength={60}
                      />
                      <button
                        className="sg-save-btn"
                        type="submit"
                        disabled={!draftName.trim() || draftName.trim() === user.name}
                      >
                        {nameSaved ? <Check size={14} /> : <Save size={14} />}
                      </button>
                    </div>
                  </form>
                </div>
              </div>

              {/* Apariencia */}
              <p className="sg-section-label">Apariencia</p>
              <div className="sg-group">
                <div className="sg-item sg-theme-item">
                  <Sun size={15} className="sg-theme-sun" />
                  <span className="sg-theme-label">Tema</span>
                  <div className="sg-theme-toggle">
                    <button
                      className={theme === 'light' ? 'active' : ''}
                      onClick={() => onThemeChange('light')}
                    >
                      <Sun size={13} />
                      Claro
                    </button>
                    <button
                      className={theme === 'dark' ? 'active' : ''}
                      onClick={() => onThemeChange('dark')}
                    >
                      <Moon size={13} />
                      Oscuro
                    </button>
                  </div>
                </div>
              </div>

              {/* Cuenta */}
              <p className="sg-section-label">Cuenta</p>
              <div className="sg-group">
                {[
                  {
                    view: 'plans' as View,
                    icon: <Zap size={16} />,
                    color: 'rgba(0,212,170,0.15)',
                    iconColor: 'var(--accent)',
                    label: 'Planes',
                    sub: currentPlan ? `Plan ${currentPlan.label}` : 'Ver opciones',
                  },
                  {
                    view: 'usage' as View,
                    icon: <BarChart2 size={16} />,
                    color: 'rgba(0,150,199,0.15)',
                    iconColor: 'var(--accent-2)',
                    label: 'Uso',
                    sub: usage.limit !== null
                      ? `${usage.used} / ${usage.limit} consultas`
                      : 'Sin límite',
                  },
                  {
                    view: 'billing' as View,
                    icon: <CreditCard size={16} />,
                    color: 'rgba(124,92,232,0.15)',
                    iconColor: 'var(--accent-3)',
                    label: 'Facturación',
                    sub: 'Plan activo y renovación',
                  },
                  {
                    view: 'about' as View,
                    icon: <HelpCircle size={16} />,
                    color: 'rgba(245,158,11,0.15)',
                    iconColor: '#f59e0b',
                    label: 'Acerca de',
                    sub: 'ACoreAI v1.0',
                  },
                ].map((item, idx, arr) => (
                  <button
                    key={item.view}
                    className={`sg-item sg-nav-item ${idx < arr.length - 1 ? 'sg-border' : ''}`}
                    onClick={() => setView(item.view)}
                  >
                    <span
                      className="sg-nav-icon"
                      style={{ background: item.color, color: item.iconColor }}
                    >
                      {item.icon}
                    </span>
                    <span className="sg-nav-text">
                      <strong>{item.label}</strong>
                      <small>{item.sub}</small>
                    </span>
                    <ChevronRight size={15} className="sg-chevron" />
                  </button>
                ))}
                <button
                  className="sg-item sg-nav-item sg-danger-action"
                  onClick={onLogout}
                >
                  <span className="sg-nav-icon">
                    <LogOut size={16} />
                  </span>
                  <span className="sg-nav-text">
                    <strong>Cerrar sesión</strong>
                    <small>Salir de tu cuenta</small>
                  </span>
                </button>
              </div>
            </>
          )}

          {/* ── Planes ────────────────────────────────────────────── */}
          {view === 'plans' && (
            <div className="sp-view">
              <p className="sp-desc">
                Compara los planes disponibles. Para cambiar de plan contacta a tu institución.
              </p>
              {PLANS.map((plan) => {
                const isCurrent = plan.role === user.role;
                return (
                  <div
                    key={plan.role}
                    className={`plan-card ${isCurrent ? 'plan-card--current' : ''}`}
                    style={{ '--pc': plan.color } as React.CSSProperties}
                  >
                    <div className="plan-card-head">
                      <div>
                        <strong>{plan.label}</strong>
                        <span>{plan.subtitle}</span>
                      </div>
                      {isCurrent ? (
                        <span className="plan-badge plan-badge--current">Tu plan</span>
                      ) : (
                        <span className="plan-badge">
                          {plan.dailyLimit !== null
                            ? `${plan.dailyLimit} / día`
                            : 'Ilimitado'}
                        </span>
                      )}
                    </div>
                    <ul className="plan-features">
                      {plan.features.map((f) => (
                        <li key={f}>
                          <Check size={11} />
                          {f}
                        </li>
                      ))}
                    </ul>
                    {!isCurrent && (
                      <p className="plan-upgrade-note">
                        Contacta a tu institución para actualizar
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Uso ───────────────────────────────────────────────── */}
          {view === 'usage' && (
            <div className="sp-view">
              <p className="sp-desc">Actividad de tu cuenta en el período actual.</p>

              <div className="sg-group">
                {/* Consultas */}
                <div className="sg-item sg-stat">
                  <span className="sg-stat-icon" style={{ background: 'rgba(0,212,170,0.12)', color: 'var(--accent)' }}>
                    <MessageSquare size={15} />
                  </span>
                  <div className="sg-stat-text">
                    <strong>Consultas hoy</strong>
                    {usage.limit !== null ? (
                      <>
                        <div className="sg-stat-bar">
                          <div
                            className="sg-stat-bar-fill"
                            style={{ width: `${Math.min((usage.used / usage.limit) * 100, 100)}%` }}
                          />
                        </div>
                        <small>{usage.used} de {usage.limit} usadas</small>
                      </>
                    ) : (
                      <small>Sin límite diario en tu plan</small>
                    )}
                  </div>
                  {usage.limit !== null && (
                    <span className="sg-stat-value">{usage.used}/{usage.limit}</span>
                  )}
                </div>

                {/* Historial */}
                <div className="sg-item sg-stat sg-border-top">
                  <span className="sg-stat-icon" style={{ background: 'rgba(0,150,199,0.12)', color: 'var(--accent-2)' }}>
                    <Shield size={15} />
                  </span>
                  <div className="sg-stat-text">
                    <strong>Retención de historial</strong>
                    <small>
                      {usage.historyDays !== null
                        ? `Las conversaciones se guardan ${usage.historyDays} días`
                        : 'Historial conservado indefinidamente'}
                    </small>
                  </div>
                  <span className="sg-stat-value" style={{ color: 'var(--accent-2)' }}>
                    {usage.historyDays !== null ? `${usage.historyDays}d` : '∞'}
                  </span>
                </div>
              </div>

              <p className="sg-section-label" style={{ marginTop: 4 }}>Funciones activas</p>
              <div className="sg-group">
                {[
                  { label: 'Explora', on: true },
                  { label: 'Traducción de idiomas', on: true },
                  { label: 'Lectura en voz alta (TTS)', on: user.role !== 'FREE' },
                  { label: 'Dictado por micrófono (STT)', on: user.role !== 'FREE' },
                  { label: 'Modelos avanzados', on: user.role === 'PLUS' || user.role === 'ADMIN' },
                ].map(({ label, on }, idx, arr) => (
                  <div
                    key={label}
                    className={`sg-item sg-feature-row ${idx < arr.length - 1 ? 'sg-border-top' : ''}`}
                  >
                    <span className={`sg-feature-dot ${on ? 'on' : 'off'}`} />
                    <span className={`sg-feature-label ${on ? '' : 'off'}`}>{label}</span>
                    {on && <Check size={13} className="sg-feature-check" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Facturación ───────────────────────────────────────── */}
          {view === 'billing' && (
            <div className="sp-view">
              <p className="sp-desc">Información de tu plan y facturación institucional.</p>

              <div
                className="billing-hero"
                style={{ '--pc': currentPlan?.color ?? 'var(--accent)' } as React.CSSProperties}
              >
                <div className="billing-hero-icon"><Sparkles size={20} /></div>
                <div className="billing-hero-text">
                  <strong>{currentPlan?.label ?? user.role}</strong>
                  <span>{currentPlan?.subtitle ?? 'Plan activo'}</span>
                </div>
                <span className="plan-badge plan-badge--current">Activo</span>
              </div>

              <div className="sg-group">
                {[
                  { label: 'Tipo de cuenta', value: 'Cuenta institucional' },
                  { label: 'Correo', value: user.email },
                  { label: 'Renovación', value: 'Gestionada por institución' },
                  { label: 'Método de pago', value: 'Factura institucional' },
                ].map(({ label, value }, idx, arr) => (
                  <div
                    key={label}
                    className={`sg-item sg-info-row ${idx < arr.length - 1 ? 'sg-border-top' : ''}`}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="sg-notice">
                <User size={13} />
                Para cambios de plan, cancelaciones o facturas contacta al administrador de tu institución.
              </div>
            </div>
          )}

          {/* ── Acerca de ─────────────────────────────────────────── */}
          {view === 'about' && (
            <div className="sp-view">
              <div className="about-hero">
                <div className="about-logo"><Sparkles size={26} /></div>
                <strong>ACoreAI</strong>
                <span>Asistente académico ACoreAI</span>
              </div>

              <div className="sg-group">
                {[
                  { label: 'Versión', value: '1.0.0' },
                  { label: 'Plataforma', value: 'Web · Vite + React' },
                  { label: 'Gateway', value: 'acoreai-gateway' },
                  { label: 'Modelos', value: 'Traducción translategemma:4b · Speaking llama3.2:3b · Experto qwen3:4b' },
                ].map(({ label, value }, idx, arr) => (
                  <div
                    key={label}
                    className={`sg-item sg-info-row ${idx < arr.length - 1 ? 'sg-border-top' : ''}`}
                  >
                    <span>{label}</span>
                    <strong>{value}</strong>
                  </div>
                ))}
              </div>

              <div className="sg-notice">
                <Shield size={13} />
                ACoreAI es una herramienta académica. No almacena información personal fuera del gateway institucional.
              </div>
            </div>
          )}

        </div>
    </div>
  );
}
