import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { automationProcessesApi } from '../lib/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import { InfoHint } from '../components/InfoHint';
import type { AutomationProcessDetail } from '../lib/types';

export type AutomationOutletContext = { process: AutomationProcessDetail };

function tabClass(isActive: boolean) {
  return `flex items-center rounded-lg px-3 py-1.5 text-sm font-medium transition ${
    isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
  }`;
}

export function AutomationProcessDetailLayout() {
  const { processId } = useParams<{ processId: string }>();
  const { data: process, isLoading, error } = useQuery({
    queryKey: ['automation-process', processId],
    queryFn: () => automationProcessesApi.get(processId!),
    enabled: !!processId,
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando proceso...</p>;
  if (error || !process) return <p className="text-sm text-red-600">No se pudo cargar el proceso.</p>;

  return (
    <div className="space-y-4">
      <Link to="/automation" className="text-sm text-slate-400 hover:text-slate-600">
        ← Volver a la lista de procesos
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{process.name}</h1>
          <p className="text-sm text-slate-500">
            {process.slug} · plataforma {process.platform} {process.role ? `· rol ${process.role}` : ''}
          </p>
        </div>
        <StatusBadge status={process.status} />
      </div>

      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-3">
        <NavLink to="" end className={({ isActive }) => tabClass(isActive)}>
          Resumen
        </NavLink>
        <NavLink to="pasos" className={({ isActive }) => tabClass(isActive)}>
          Pasos
        </NavLink>
        <NavLink to="campos" className={({ isActive }) => tabClass(isActive)}>
          Campos
        </NavLink>
        <NavLink to="reglas" className={({ isActive }) => tabClass(isActive)}>
          Reglas
        </NavLink>
        <NavLink to="plantillas" className={({ isActive }) => tabClass(isActive)}>
          Plantillas de payload
        </NavLink>
        <NavLink to="checklist" className={({ isActive }) => tabClass(isActive)}>
          Checklist
        </NavLink>
        <NavLink to="logs" className={({ isActive }) => tabClass(isActive)}>
          Logs
          <InfoHint text="Registro de ejecuciones. Hoy se llena manualmente porque todavía no existe un ejecutor real (bot) que entre a ACOREAI — queda listo para cuando exista." />
        </NavLink>
      </div>

      <Outlet context={{ process } satisfies AutomationOutletContext} />
    </div>
  );
}
