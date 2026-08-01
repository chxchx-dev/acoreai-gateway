import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import { type DemoUser, type UserRole, storeUser } from '../lib/auth';
import { ApiError, loginUser } from '../lib/gateway';
import alaniaHola from '../assets/alania/alania_hola.png';
import alaniaIdea from '../assets/alania/alania_idea.png';
import alaniaNopasa from '../assets/alania/alania_nopasa.png';
import alaniaUps from '../assets/alania/alania_ups.png';

type LoginScreenProps = {
  onLogin: (user: DemoUser) => void;
};

type Mood = 'hola' | 'pensando' | 'timida' | 'ups';

const MOOD_ART: Record<Mood, string> = {
  hola:     alaniaHola,
  pensando: alaniaIdea,
  timida:   alaniaNopasa,
  ups:      alaniaUps,
};

const MOODS = Object.keys(MOOD_ART) as Mood[];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const REMEMBER_KEY = 'alania-web:remember-email';

  const [email, setEmail]                 = useState(() => window.localStorage.getItem(REMEMBER_KEY) ?? '');
  const [password, setPassword]           = useState('');
  const [remember, setRemember]           = useState(() => !!window.localStorage.getItem(REMEMBER_KEY));
  const [showPassword, setShowPassword]   = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [error, setError]                 = useState('');
  const [shake, setShake]                 = useState(false);
  const [loading, setLoading]             = useState(false);
  const shellRef                          = useRef<HTMLElement>(null);

  // Spotlight: actualiza --mx/--my con umbral de 5px para no disparar en cada pixel.
  // El ::after usa translateZ(0) para ser su propia capa GPU y el shell tiene
  // contain:paint, así el repaint queda completamente aislado.
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!window.matchMedia('(hover: hover)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let raf = 0;
    let lx = -9999, ly = -9999;

    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lx, dy = e.clientY - ly;
      if (dx * dx + dy * dy < 25) return;
      lx = e.clientX; ly = e.clientY;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        shell.style.setProperty('--mx', lx + 'px');
        shell.style.setProperty('--my', ly + 'px');
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  const mood: Mood = loading
    ? 'pensando'
    : error
      ? 'ups'
      : passwordFocus && !showPassword
        ? 'timida'
        : 'hola';

  const canSubmit = useMemo(
    () => email.trim().length > 0 && password.trim().length > 0 && !loading,
    [email, password, loading],
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    await attemptLogin();
  }

  async function attemptLogin(opts?: { force?: boolean }) {
    setError('');
    setLoading(true);
    try {
      const { token, refreshToken, user } = await loginUser(email.trim(), password, opts);
      const demoUser: DemoUser = {
        id:    user.id,
        email: user.email,
        name:  user.name,
        role:  user.role as UserRole,
        token,
        refreshToken,
      };
      if (remember) {
        window.localStorage.setItem(REMEMBER_KEY, email.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      storeUser(demoUser);
      onLogin(demoUser);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && (err.body as { code?: string } | undefined)?.code === 'ACCOUNT_SESSION_ACTIVE') {
        setLoading(false);
        const confirmed = window.confirm(
          'Tu cuenta ya está activa en otro dispositivo. ¿Quieres continuar aquí y cerrar esa sesión?',
        );
        if (confirmed) await attemptLogin({ force: true });
        return;
      }
      setError(
        (err as Error).message?.includes('401') || (err as Error).message?.includes('inválid')
          ? 'Correo o contraseña incorrectos.'
          : 'No se pudo conectar con el servidor. Verifica tu conexión.',
      );
      setShake(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="lg-shell" ref={shellRef}>
      <section className="lg-scene">
        <div className="lg-hero" aria-hidden="true">
          <div className="lg-ring" />
          {MOODS.map((key) => (
            <img
              key={key}
              className={`lg-alania${mood === key ? ' is-active' : ''}`}
              src={MOOD_ART[key]}
              alt=""
            />
          ))}
        </div>

        <form
          className={`lg-card${shake ? ' lg-shake' : ''}`}
          onSubmit={submit}
          onAnimationEnd={() => setShake(false)}
          autoComplete="off"
        >
          <header className="lg-brand">
            <h1>
              Alan<span>IA</span>
            </h1>
            <p>Tu asistente académico</p>
          </header>

          <p className="lg-greeting">Qué bueno verte. Inicia sesión para continuar.</p>

          <label className="lg-field">
            <span>Correo institucional</span>
            <div className="lg-control">
              <Mail size={18} />
              <input
                type="email"
                value={email}
                placeholder="nombre@institucion.edu.co"
                autoComplete="off"
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </label>

          <label className="lg-field">
            <span>Contraseña</span>
            <div className="lg-control">
              <LockKeyhole size={18} />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                placeholder="••••••••"
                autoComplete="new-password"
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
              />
              <button
                className="lg-eye"
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>

          <label className="lg-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Recordar mi correo</span>
          </label>

          {error ? (
            <p className="lg-error" role="alert">
              {error}
            </p>
          ) : null}

          <button className="lg-submit" type="submit" disabled={!canSubmit}>
            {loading ? <span className="lg-spinner" /> : null}
            {loading ? 'Ingresando…' : 'Comenzar'}
            {loading ? null : <ArrowRight size={18} />}
          </button>
        </form>
      </section>
    </main>
  );
}
