import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Eye, EyeOff, IdCard, LockKeyhole } from "lucide-react";
import { type DemoUser, type UserRole, storeUser } from "../lib/auth";
import { loginUser } from "../lib/gateway";
import alaniaHola from "../assets/alania/alania_hola.png";
import alaniaIdea from "../assets/alania/alania_idea.png";
import alaniaNopasa from "../assets/alania/alania_nopasa.png";
import alaniaUps from "../assets/alania/alania_ups.png";
import olanAcademic from "../assets/olan/OLAN-ACADEMIC.png";
import olanBg from "../assets/olan/background_splash_screen.png";

type LoginScreenProps = { onLogin: (user: DemoUser) => void };
type Mood = "hola" | "pensando" | "timida" | "ups";

const MOOD_ART: Record<Mood, string> = {
  hola: alaniaHola,
  pensando: alaniaIdea,
  timida: alaniaNopasa,
  ups: alaniaUps,
};
const MOODS = Object.keys(MOOD_ART) as Mood[];

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const REMEMBER_KEY = "olan-web:remember-id";

  const [identificacion, setIdentificacion] = useState(
    () => window.localStorage.getItem(REMEMBER_KEY) ?? "",
  );
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(
    () => !!window.localStorage.getItem(REMEMBER_KEY),
  );
  const [showPassword, setShowPassword] = useState(false);
  const [passwordFocus, setPasswordFocus] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);
  const [loading, setLoading] = useState(false);
  const shellRef = useRef<HTMLElement>(null);

  // Spotlight cursor sobre el fondo (solo cost GPU via mask)
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) return;
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let raf = 0,
      lx = -9999,
      ly = -9999;
    const onMove = (e: PointerEvent) => {
      const dx = e.clientX - lx,
        dy = e.clientY - ly;
      if (dx * dx + dy * dy < 25) return;
      lx = e.clientX;
      ly = e.clientY;
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

  const mood: Mood = loading
    ? "pensando"
    : error
      ? "ups"
      : passwordFocus && !showPassword
        ? "timida"
        : "hola";

  const canSubmit = useMemo(
    () =>
      identificacion.trim().length > 0 &&
      password.trim().length > 0 &&
      !loading,
    [identificacion, password, loading],
  );

  async function runLogin() {
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    try {
      const { token, refreshToken, proyecto, user } = await loginUser(
        identificacion.trim(),
        password,
      );
      const demoUser: DemoUser = {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role as UserRole,
        token,
        refreshToken,
      };
      if (remember) {
        window.localStorage.setItem(REMEMBER_KEY, identificacion.trim());
      } else {
        window.localStorage.removeItem(REMEMBER_KEY);
      }
      if (proyecto) {
        window.localStorage.setItem('olan-web:proyecto', proyecto);
      }
      storeUser(demoUser);
      onLogin(demoUser);
    } catch (err) {
      const message = (err as Error).message || "";
      setError(
        message.includes("comercial")
          ? message
          : message.includes("401") ||
              message.includes("inválid")
          ? "Identificación o contraseña incorrectos."
          : "No se pudo conectar. Verifica tu conexión.",
      );
      setShake(true);
    } finally {
      setLoading(false);
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    await runLogin();
  }

  return (
    <main
      className="ol-shell"
      ref={shellRef}
      style={{
        backgroundImage: `url(${olanBg}), linear-gradient(160deg, #0f2860 0%, #1a3a8f 50%, #0c1f5c 100%)`,
      }}
    >
      <div className="ol-overlay" />

      <section className="ol-scene">
        {/* Mascota Alania con gestos */}
        <div className="ol-hero" aria-hidden="true">
          <div className="ol-ring" />
          {MOODS.map((key) => (
            <img
              key={key}
              className={`ol-alania${mood === key ? " is-active" : ""}`}
              src={MOOD_ART[key]}
              alt=""
            />
          ))}
        </div>

        {/* Card de login */}
        <form
          className={`ol-card${shake ? " ol-shake" : ""}`}
          onSubmit={submit}
          onAnimationEnd={() => setShake(false)}
          autoComplete="off"
          action="#"
        >
          {/* Identidad OLAN dentro del card */}
          <div className="ol-brand">
            <img
              src={olanAcademic}
              alt="OLAN Academic"
              className="ol-academic-logo"
            />
            <h1 className="ol-brand-name">
              Alan<span>IA</span>
            </h1>
            <p className="ol-brand-sub">Tutor Virtual</p>
          </div>

          <p className="ol-greeting">Ingresa con tus credenciales OLAN</p>

          <div className="ol-field">
            <label className="ol-label">Identificación</label>
            <div className="ol-control">
              <IdCard size={18} className="ol-ico" />
              <input
                type="text"
                value={identificacion}
                placeholder="Número de identificación"
                autoComplete="username"
                onChange={(e) => setIdentificacion(e.target.value)}
              />
            </div>
          </div>

          <div className="ol-field">
            <label className="ol-label">Contraseña</label>
            <div className="ol-control">
              <LockKeyhole size={18} className="ol-ico" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                placeholder="••••••••"
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocus(true)}
                onBlur={() => setPasswordFocus(false)}
              />
              <button
                type="button"
                className="ol-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={
                  showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                }
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <label className="ol-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <span>Recordar mi identificación</span>
          </label>

          {error && (
            <p className="ol-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="button"
            className="ol-btn"
            disabled={!canSubmit}
            onClick={() => {
              void runLogin();
            }}
          >
            {loading && <span className="ol-spinner" />}
            {loading ? "Ingresando…" : "Ingresar"}
            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="ol-footer">
          © 2026 OLAN · Tecnología para la eficiencia educativa
        </p>
      </section>
    </main>
  );
}
