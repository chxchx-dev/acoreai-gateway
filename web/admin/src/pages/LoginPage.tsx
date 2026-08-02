import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../lib/endpoints';
import { setSession } from '../lib/auth';
import { ApiError } from '../lib/api';
import { Button } from '../components/Button';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function attemptLogin(opts?: { force?: boolean }) {
    setError(null);
    setLoading(true);
    try {
      const { accessToken, user } = await authApi.login(email, password, opts);
      setSession(accessToken, user);
      navigate('/dashboard');
    } catch (err) {
      if (err instanceof ApiError && err.status === 409 && (err.body as { code?: string } | null)?.code === 'ACCOUNT_SESSION_ACTIVE') {
        setLoading(false);
        const confirmed = window.confirm(
          'Tu cuenta ya está activa en otro dispositivo. ¿Quieres continuar aquí y cerrar esa sesión?',
        );
        if (confirmed) await attemptLogin({ force: true });
        return;
      }
      setError(err instanceof ApiError ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    return attemptLogin();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-card">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-base font-bold text-white">
            O
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight text-slate-800">Centro de Conocimiento</h1>
            <p className="text-xs text-slate-400">Panel administrativo de ACoreAI AI Gateway</p>
          </div>
        </div>

        {error && <div className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        <label className="mb-3 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Correo</span>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input" />
        </label>

        <label className="mb-6 block text-sm">
          <span className="mb-1 block font-medium text-slate-700">Contraseña</span>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="input" />
        </label>

        <Button type="submit" loading={loading} className="w-full">
          {loading ? 'Ingresando...' : 'Ingresar'}
        </Button>
      </form>
    </div>
  );
}
