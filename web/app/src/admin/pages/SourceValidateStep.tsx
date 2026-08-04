import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { SourceOutletContext } from './SourceDetailLayout';
import { Panel } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { chunksApi, sourcesApi } from '../lib/endpoints';
import { can } from '../lib/permissions';
import { formatDateOnly } from '../lib/date';
import { ApiError } from '../lib/api';
import type { KnowledgeChunk } from '../lib/types';

const REVIEWABLE_STATUSES = ['pending_review', 'needs_changes'];

export function SourceValidateStep() {
  const { source } = useOutletContext<SourceOutletContext>();
  const queryClient = useQueryClient();
  const latestVersion = source.versions[0];
  const [search, setSearch] = useState('');
  const [comments, setComments] = useState('');

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['source', source.id] });

  const reprocessMutation = useMutation({ mutationFn: () => sourcesApi.reprocess(source.id), onSuccess: invalidate });

  const inReviewableStatus = REVIEWABLE_STATUSES.includes(source.status);
  const canReview = inReviewableStatus && can('approve');
  const canEditChunks = inReviewableStatus && can('edit_chunk');

  const reviewMutation = useMutation({
    mutationFn: (decision: 'approved' | 'rejected' | 'needs_changes') =>
      sourcesApi.review(source.id, { decision, comments: comments || undefined }),
    onSuccess: invalidate,
    onError: (err: unknown) => alert(err instanceof ApiError ? err.message : 'No se pudo enviar la revisión'),
  });

  const filteredChunks = source.chunks.filter((c) => c.content.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Metadata">
          <dl className="space-y-1.5 text-sm">
            <Row label="Título" value={source.title} />
            <Row label="Descripción" value={source.description ?? '—'} />
            <Row label="Tipo" value={source.sourceType} />
            <Row label="Área" value={source.area ?? '—'} />
            <Row label="Idioma" value={source.language} />
            <Row label="Prioridad" value={String(source.priority)} />
            <Row label="Vigente desde" value={source.validFrom ? formatDateOnly(source.validFrom) : '—'} />
            <Row label="Vigente hasta" value={source.validUntil ? formatDateOnly(source.validUntil) : '—'} />
            <Row label="Checksum" value={source.checksum?.slice(0, 12) ?? '—'} />
          </dl>
        </Panel>

        <Panel title="Archivo original">
          {source.originalFilename ? (
            <dl className="space-y-1.5 text-sm">
              <Row label="Nombre" value={source.originalFilename} />
              <Row label="Mime type" value={source.mimeType ?? '—'} />
            </dl>
          ) : (
            <p className="text-sm text-slate-400">Fuente creada como texto manual, sin archivo original.</p>
          )}

          {can('edit_metadata') && (
            <Button variant="secondary" size="sm" onClick={() => reprocessMutation.mutate()} loading={reprocessMutation.isPending} className="mt-4 w-full">
              Reprocesar extracción
            </Button>
          )}
        </Panel>

        <Panel
          title="Jobs de procesamiento"
          hint="Tareas automáticas en segundo plano: extraer texto, dividir en chunks, generar embeddings. Si alguna queda 'Fallido', usa 'Reprocesar extracción' o el reintento de embeddings en el paso Publicar."
        >
          <ul className="space-y-2 text-sm">
            {source.processingJobs.map((job) => (
              <li key={job.id} className="flex items-center justify-between gap-2">
                <div>
                  <div className="font-medium">{job.jobType}</div>
                  {job.errorMessage && <div className="text-xs text-red-600">{job.errorMessage}</div>}
                </div>
                <StatusBadge status={job.status} />
              </li>
            ))}
            {source.processingJobs.length === 0 && <li className="text-slate-400">Sin jobs todavía</li>}
          </ul>
        </Panel>

        <Panel title="Texto extraído" hint="El texto completo tal como se extrajo del archivo/contenido, antes de dividirse en chunks. Sirve para verificar que la extracción no perdió ni corrompió nada.">
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
            {latestVersion?.extractedText || 'Todavía no hay texto extraído.'}
          </pre>
        </Panel>

        <Panel title="Historial de revisiones" hint="Cada vez que un supervisor aprueba, rechaza o pide cambios sobre el documento completo, queda un registro acá — no se puede borrar ni editar después.">
          <ul className="space-y-2 text-sm">
            {source.reviews.map((r) => (
              <li key={r.id} className="border-b border-slate-100 pb-2 last:border-0">
                <div className="flex items-center justify-between">
                  <StatusBadge status={r.decision} />
                  <span className="text-xs text-slate-400">{new Date(r.createdAt).toLocaleString()}</span>
                </div>
                {r.comments && <p className="mt-1 text-xs text-slate-600">{r.comments}</p>}
              </li>
            ))}
            {source.reviews.length === 0 && <li className="text-slate-400">Sin revisiones todavía</li>}
          </ul>
        </Panel>

        <Panel title="Versiones" hint="Cada edición sustancial de una fuente ya publicada crea una versión nueva. Las versiones anteriores no se borran: pasan a archivadas cuando se publica la siguiente.">
          <ul className="space-y-1 text-sm">
            {source.versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between">
                <span>v{v.version}</span>
                <StatusBadge status={v.status} />
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="space-y-3">
        <h2 className="flex items-center text-sm font-semibold text-slate-600">
          Revisión de chunks
          <InfoHint text="Un chunk es un fragmento del documento (no el documento completo). El buscador del chat recupera chunks individuales, por eso cada uno se aprueba/rechaza por separado — un documento puede tener partes buenas y partes que necesiten corrección." />
        </h2>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-card">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar dentro de los chunks..."
            className="input max-w-xs"
          />

          {canReview ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Comentario de revisión (opcional)"
                className="input w-64"
              />
              <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => reviewMutation.mutate('approved')}>
                Aprobar documento completo
              </Button>
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600" onClick={() => reviewMutation.mutate('needs_changes')}>
                Pedir cambios
              </Button>
              <Button size="sm" variant="danger" className="bg-red-600 text-white hover:bg-red-700" onClick={() => reviewMutation.mutate('rejected')}>
                Rechazar
              </Button>
            </div>
          ) : (
            <span className="text-xs text-slate-400">
              {inReviewableStatus
                ? 'Tu rol no puede aprobar/rechazar documentos.'
                : `Esta fuente ya no está en revisión (estado: ${source.status}). Para editar chunks, crea una nueva versión.`}
            </span>
          )}
        </div>

        <div className="space-y-3">
          {filteredChunks.map((chunk) => (
            <ChunkCard key={chunk.id} chunk={chunk} editable={canEditChunks} onChanged={invalidate} />
          ))}
          {filteredChunks.length === 0 && <p className="text-sm text-slate-400">No hay chunks que coincidan.</p>}
        </div>
      </div>
    </div>
  );
}

function ChunkCard({ chunk, editable, onChanged }: { chunk: KnowledgeChunk; editable: boolean; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(chunk.content);

  const updateMutation = useMutation({
    mutationFn: () => chunksApi.update(chunk.id, { content }),
    onSuccess: () => {
      onChanged();
      setEditing(false);
    },
  });
  const approveMutation = useMutation({ mutationFn: () => chunksApi.approve(chunk.id), onSuccess: onChanged });
  const rejectMutation = useMutation({ mutationFn: () => chunksApi.reject(chunk.id), onSuccess: onChanged });
  const removeMutation = useMutation({ mutationFn: () => chunksApi.remove(chunk.id), onSuccess: onChanged });

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
        <span>
          Chunk {chunk.chunkIndex} {chunk.sectionTitle ? `· ${chunk.sectionTitle}` : ''} · {chunk.tokensCount ?? '?'} tokens
          {chunk.pageStart ? ` · página ${chunk.pageStart}` : ''}
        </span>
        <StatusBadge status={chunk.status} />
      </div>

      {editing ? (
        <textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="input font-mono text-xs" />
      ) : (
        <p className="whitespace-pre-wrap text-sm text-slate-700">{chunk.content}</p>
      )}

      {editable && (
        <div className="mt-3 flex gap-2">
          {editing ? (
            <>
              <Button size="sm" onClick={() => updateMutation.mutate()} loading={updateMutation.isPending}>
                Guardar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setEditing(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="secondary" onClick={() => setEditing(true)}>
                Editar
              </Button>
              <Button size="sm" variant="secondary" className="border-green-300 text-green-700 hover:bg-green-50" onClick={() => approveMutation.mutate()}>
                Aprobar
              </Button>
              <Button size="sm" variant="danger" onClick={() => rejectMutation.mutate()}>
                Rechazar
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  if (confirm('¿Eliminar este chunk?')) removeMutation.mutate();
                }}
              >
                Eliminar
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-400">{label}</dt>
      <dd className="text-right text-slate-700">{value}</dd>
    </div>
  );
}
