import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SourceOutletContext } from './SourceDetailLayout';
import { Panel } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { humanizeWarning } from '../lib/warnings';
import { sourcesApi } from '../lib/endpoints';
import { can } from '../lib/permissions';

export function SourcePublishStep() {
  const { source } = useOutletContext<SourceOutletContext>();
  const queryClient = useQueryClient();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['source', source.id] });

  const reprocessMutation = useMutation({ mutationFn: () => sourcesApi.reprocess(source.id), onSuccess: invalidate });
  const embeddingsMutation = useMutation({
    mutationFn: () => sourcesApi.generateEmbeddings(source.id),
    onSuccess: invalidate,
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'No se pudo reintentar'),
  });
  const publishMutation = useMutation({
    mutationFn: () => sourcesApi.publish(source.id),
    onSuccess: invalidate,
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'No se pudo publicar'),
  });
  const archiveMutation = useMutation({
    mutationFn: () => sourcesApi.archive(source.id),
    onSuccess: invalidate,
  });

  const canRetryEmbeddings = source.status === 'embedding_pending' || source.status === 'embedding_failed';
  const canPublish = source.status === 'ready_to_publish';
  const noActionsAvailable =
    !can('edit_metadata') && !can('publish') && !can('archive');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel title="Estado actual" hint="Resumen de dónde va esta fuente en el ciclo: borrador → revisión → embeddings → lista para publicar → publicada. Las advertencias de abajo suelen ser lo que falta para poder publicar.">

        <div className="mb-3 flex items-center gap-2">
          <StatusBadge status={source.status} />
          <span className="text-xs text-slate-400">v{source.currentVersion}</span>
        </div>

        {source.warnings.length > 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            <strong className="mb-1 block">Advertencias antes de publicar:</strong>
            <ul className="list-inside list-disc space-y-0.5">
              {source.warnings.map((w) => (
                <li key={w}>{humanizeWarning(w)}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-slate-400">Sin advertencias pendientes.</p>
        )}
      </Panel>

      <Panel
        title="Acciones"
        hint="Todos los controles del ciclo de publicación en un solo lugar: reprocesar, reintentar embeddings, publicar y archivar."
      >
        <div className="space-y-2">
          {can('edit_metadata') && (
            <Button
              variant="secondary"
              onClick={() => reprocessMutation.mutate()}
              loading={reprocessMutation.isPending}
              title="Vuelve a extraer y dividir en chunks el texto ya guardado, sin pedir el archivo de nuevo. Útil si cambiaste reglas de chunking o hubo un error."
              className="w-full"
            >
              Reprocesar extracción
            </Button>
          )}

          {can('edit_metadata') && canRetryEmbeddings && (
            <Button
              variant="secondary"
              onClick={() => embeddingsMutation.mutate()}
              loading={embeddingsMutation.isPending}
              title="Genera de nuevo el vector de embedding para los chunks aprobados. Necesario si el estado quedó en 'Embeddings fallidos'."
              className="w-full"
            >
              Reintentar embeddings
            </Button>
          )}

          {can('publish') && (
            <Button
              onClick={() => publishMutation.mutate()}
              disabled={!canPublish}
              loading={publishMutation.isPending}
              title="Activa esta versión en el chat real. Si ya había una versión publicada de esta misma fuente, esa versión pasa a archivada (no se borra)."
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {publishMutation.isPending ? 'Publicando...' : 'Publicar fuente'}
            </Button>
          )}
          {can('publish') && !canPublish && (
            <p className="text-xs text-slate-400">
              Solo se puede publicar cuando el estado es "lista para publicar". Estado actual: {source.status}.
            </p>
          )}

          {can('archive') && source.status !== 'archived' && (
            <Button
              variant="danger"
              onClick={() => {
                if (confirm('¿Archivar esta fuente?')) archiveMutation.mutate();
              }}
              title="Deja de responder en el chat de inmediato. No se borra: sigue visible en el historial, solo cambia de estado."
              className="w-full"
            >
              Archivar
            </Button>
          )}

          {noActionsAvailable && <p className="text-xs text-slate-400">Tu rol no tiene acciones disponibles sobre esta fuente.</p>}
        </div>
      </Panel>
    </div>
  );
}
