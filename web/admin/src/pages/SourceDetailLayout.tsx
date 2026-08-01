import { Link, Outlet, useLocation, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { sourcesApi } from '../lib/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import { Stepper } from '../components/Stepper';
import { WIZARD_STEPS } from '../lib/wizardSteps';
import { humanizeWarning } from '../lib/warnings';
import { InfoHint } from '../components/InfoHint';
import type { KnowledgeSourceDetail } from '../lib/types';

export type SourceOutletContext = { source: KnowledgeSourceDetail };

function currentStepFromPath(pathname: string): number {
  if (pathname.endsWith('/publicar')) return 3;
  if (pathname.endsWith('/preguntar')) return 4;
  return 2;
}

export function SourceDetailLayout() {
  const { sourceId } = useParams<{ sourceId: string }>();
  const location = useLocation();
  const { data: source, isLoading, error } = useQuery({
    queryKey: ['source', sourceId],
    queryFn: () => sourcesApi.get(sourceId!),
    enabled: !!sourceId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const inFlight = status && ['pending_extraction', 'extracted', 'chunked', 'embedding_pending'].includes(status);
      return inFlight ? 3000 : false;
    },
  });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando fuente...</p>;
  if (error || !source) return <p className="text-sm text-red-600">No se pudo cargar la fuente.</p>;

  return (
    <div className="space-y-4">
      <Link to="/knowledge" className="text-sm text-slate-400 hover:text-slate-600">
        ← Volver a la bandeja
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-xl font-bold text-slate-800">
            {source.title}
            <InfoHint text="v{n} es la versión actual del contenido. Al editar y volver a procesar una fuente ya publicada, se crea una versión nueva sin perder la anterior (queda archivada, no se borra)." />
          </h1>
          <p className="text-sm text-slate-500">
            {source.area ?? 'Sin área'} · v{source.currentVersion} · {source.chunks.length} chunks
          </p>
        </div>
        <StatusBadge status={source.status} />
      </div>

      {source.warnings.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <strong className="mb-1 block">Advertencias antes de aprobar:</strong>
          <ul className="list-inside list-disc space-y-0.5">
            {source.warnings.map((w) => (
              <li key={w}>{humanizeWarning(w)}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="border-b border-slate-200 pb-4">
        <Stepper
          current={currentStepFromPath(location.pathname)}
          steps={[
            { label: WIZARD_STEPS[0] },
            { label: WIZARD_STEPS[1], to: '' },
            { label: WIZARD_STEPS[2], to: 'publicar' },
            { label: WIZARD_STEPS[3], to: 'preguntar' },
          ]}
        />
      </div>

      <Outlet context={{ source } satisfies SourceOutletContext} />
    </div>
  );
}
