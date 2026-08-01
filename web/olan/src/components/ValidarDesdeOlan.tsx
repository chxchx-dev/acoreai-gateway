import { useEffect, useRef, useState } from "react";
import { type DemoUser, type UserRole, storeUser } from "../lib/auth";
import { ApiError, loginOlanToken } from "../lib/gateway";
import alaniaHola from "../assets/alania/alania_hola.png";
import alaniaUps from "../assets/alania/alania_ups.png";
import olanAcademic from "../assets/olan/OLAN-ACADEMIC.png";
import olanBg from "../assets/olan/background_splash_screen.png";

type Props = {
  identificacion: string;
  olanToken: string;
  onLogin: (user: DemoUser) => void;
};

export function ValidarDesdeOlan({ identificacion, olanToken, onLogin }: Props) {
  const [error, setError] = useState<string | null>(null);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    function attempt(opts?: { force?: boolean }) {
      loginOlanToken(identificacion, olanToken, opts)
        .then(({ token, refreshToken, user }) => {
          const demoUser: DemoUser = {
            id:           user.id,
            email:        user.email,
            name:         user.name,
            role:         user.role as UserRole,
            token,
            refreshToken,
          };
          storeUser(demoUser);
          // Limpiar la URL de los params sensibles antes de continuar
          window.history.replaceState(null, '', '/');
          onLogin(demoUser);
        })
        .catch((err: Error) => {
          if (err instanceof ApiError && err.status === 409 && (err.body as { code?: string } | undefined)?.code === 'ACCOUNT_SESSION_ACTIVE') {
            const confirmed = window.confirm(
              'Tu cuenta ya está activa en otro dispositivo. ¿Quieres continuar aquí y cerrar esa sesión?',
            );
            if (confirmed) attempt({ force: true });
            else setError('Inicio de sesión cancelado: tu cuenta sigue activa en el otro dispositivo.');
            return;
          }

          const message = err.message || '';
          setError(
            message.includes('comercial')
              ? message
              : message.includes('401') || message.toLowerCase().includes('inválid')
                ? 'Token inválido o sesión expirada. Vuelve a ingresar desde OLAN.'
              : 'No se pudo conectar con el servidor. Intenta de nuevo.',
          );
        });
    }

    attempt();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className="ol-shell"
      style={{
        backgroundImage: `url(${olanBg}), linear-gradient(160deg, #0f2860 0%, #1a3a8f 50%, #0c1f5c 100%)`,
      }}
    >
      <div className="ol-overlay" />

      <section className="ol-scene">
        <div className="ol-hero" aria-hidden="true">
          <div className="ol-ring" />
          <img
            className="ol-alania is-active"
            src={error ? alaniaUps : alaniaHola}
            alt=""
          />
        </div>

        <div className="ol-card" style={{ textAlign: 'center', gap: '1.25rem' }}>
          <div className="ol-brand">
            <img src={olanAcademic} alt="OLAN Academic" className="ol-academic-logo" />
            <h1 className="ol-brand-name">Alan<span>IA</span></h1>
            <p className="ol-brand-sub">Tutor Virtual</p>
          </div>

          {error ? (
            <>
              <p className="ol-error" role="alert" style={{ marginTop: 0 }}>{error}</p>
              <a
                href="https://olan.com.co"
                className="ol-btn"
                style={{ textDecoration: 'none', display: 'flex', justifyContent: 'center' }}
              >
                Volver a OLAN
              </a>
            </>
          ) : (
            <>
              <span className="ol-spinner" style={{ alignSelf: 'center', width: 28, height: 28 }} />
              <p style={{ color: 'var(--text-2)', fontSize: '0.9rem', margin: 0 }}>
                Verificando tu sesión…
              </p>
            </>
          )}
        </div>

        <p className="ol-footer">© 2026 OLAN · Tecnología para la eficiencia educativa</p>
      </section>
    </main>
  );
}
