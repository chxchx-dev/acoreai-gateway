import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { sourcesApi } from '../lib/endpoints';
import { StatusBadge, STATUS_LABELS } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { can } from '../lib/permissions';
import { formatDateOnly } from '../lib/date';
import { InfoHint } from '../components/InfoHint';
import type { SourceStatus } from '../lib/types';

const STATUS_OPTIONS: SourceStatus[] = [
  'draft',
  'pending_extraction',
  'extracted',
  'chunked',
  'pending_review',
  'needs_changes',
  'approved',
  'embedding_pending',
  'embedding_failed',
  'ready_to_publish',
  'published',
  'rejected',
  'archived',
  'expired',
];

export function SourcesListPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: sources, isLoading, error } = useQuery({ queryKey: ['sources'], queryFn: sourcesApi.list });

  const [statusFilter, setStatusFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const archiveMutation = useMutation({
    mutationFn: (id: string) => sourcesApi.archive(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => sourcesApi.publish(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['sources'] }),
    onError: (err: unknown) => alert(err instanceof Error ? err.message : 'No se pudo publicar'),
  });

  const areas = useMemo(
    () => Array.from(new Set((sources ?? []).map((s) => s.area).filter(Boolean))) as string[],
    [sources],
  );
  const languages = useMemo(
    () => Array.from(new Set((sources ?? []).map((s) => s.language).filter(Boolean))),
    [sources],
  );
  const types = useMemo(
    () => Array.from(new Set((sources ?? []).map((s) => s.sourceType).filter(Boolean))),
    [sources],
  );

  const filtered = (sources ?? []).filter((s) => {
    if (statusFilter && s.status !== statusFilter) return false;
    if (areaFilter && s.area !== areaFilter) return false;
    if (languageFilter && s.language !== languageFilter) return false;
    if (typeFilter && s.sourceType !== typeFilter) return false;
    return true;
  });

  const isEmpty = !isLoading && (sources ?? []).length === 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-xl font-bold text-slate-800">
            Fuente de conocimiento
            <InfoHint text="Documentos, textos y páginas que alimentan las respuestas de ACoreAI (RAG). Cada fuente pasa por: Cargar → Revisar y validar → Publicar → Preguntar (probarla). Solo lo publicado responde en el chat." />
          </h1>
          <p className="text-sm text-slate-500">Documentos, textos y páginas que el chat puede usar una vez publicados.</p>
        </div>
        {can('create_source') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/knowledge/new')}>
            Nueva fuente
          </Button>
        )}
      </div>

      {isEmpty ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">Todavía no hay ninguna fuente cargada.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            El ciclo es: cargar → revisar y aprobar → publicar. Solo lo publicado responde en el chat.
          </p>
          {can('create_source') && (
            <Button className="mt-4" onClick={() => navigate('/knowledge/new')}>
              Cargar la primera fuente
            </Button>
          )}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
            <span className="flex items-center text-xs text-slate-400">
              Filtrar por
              <InfoHint text="El estado avanza así: borrador → pendiente de extracción/chunking → pendiente de revisión → aprobado → generando embeddings → listo para publicar → publicado. 'Vencido' aparece solo si pasó la fecha 'vigente hasta'." />
            </span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Todos los estados</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s] ?? s}
                </option>
              ))}
            </select>
            <select value={areaFilter} onChange={(e) => setAreaFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Todas las áreas</option>
              {areas.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
            <select value={languageFilter} onChange={(e) => setLanguageFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Todos los idiomas</option>
              {languages.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </select>
            <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
              <option value="">Todos los tipos</option>
              {types.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-sm text-red-600">No se pudieron cargar las fuentes.</p>}

          <Table>
            <Thead>
              <tr>
                <Th>Título</Th>
                <Th>Área</Th>
                <Th>Tipo</Th>
                <Th>Estado</Th>
                <Th>Versión</Th>
                <Th>Subido</Th>
                <Th>Vence</Th>
                <Th>Acciones</Th>
              </tr>
            </Thead>
            <Tbody>
              {filtered.map((s) => (
                <Tr key={s.id}>
                  <Td>
                    <Link to={`/knowledge/${s.id}`} className="font-medium text-brand-700 hover:underline">
                      {s.title}
                    </Link>
                  </Td>
                  <Td>{s.area ?? '—'}</Td>
                  <Td>{s.sourceType}</Td>
                  <Td>
                    <StatusBadge status={s.status} />
                  </Td>
                  <Td>v{s.currentVersion}</Td>
                  <Td className="text-slate-500">{new Date(s.createdAt).toLocaleDateString()}</Td>
                  <Td className="text-slate-500">{s.validUntil ? formatDateOnly(s.validUntil) : '—'}</Td>
                  <Td>
                    <div className="flex gap-2">
                      <Link to={`/knowledge/${s.id}`} className="text-xs text-brand-700 hover:underline">
                        Ver
                      </Link>
                      {s.status === 'ready_to_publish' && can('publish') && (
                        <button
                          onClick={() => publishMutation.mutate(s.id)}
                          className="text-xs text-green-700 hover:underline"
                        >
                          Publicar
                        </button>
                      )}
                      {s.status !== 'archived' && can('archive') && (
                        <button
                          onClick={() => {
                            if (confirm(`¿Archivar "${s.title}"?`)) archiveMutation.mutate(s.id);
                          }}
                          className="text-xs text-slate-500 hover:underline"
                        >
                          Archivar
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <Td colSpan={8} className="py-6 text-center text-slate-400">
                    Ninguna fuente coincide con esos filtros.
                  </Td>
                </tr>
              )}
            </Tbody>
          </Table>
        </>
      )}
    </div>
  );
}
