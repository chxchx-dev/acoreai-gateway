import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle, Layers, XCircle, HelpCircle } from 'lucide-react';
import { dashboardApi } from '../lib/endpoints';
import { StatCard, Panel } from '../components/Card';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { can } from '../lib/permissions';
import { formatDateOnly } from '../lib/date';
import { getStoredUser } from '../../lib/auth';
import { HistoryExportPanel } from '../components/HistoryExportPanel';
import { InfoHint } from '../components/InfoHint';

export function DashboardPage() {
  const navigate = useNavigate();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: dashboardApi.get });

  if (isLoading) return <p className="text-sm text-slate-500">Cargando dashboard...</p>;
  if (error || !data) return <p className="text-sm text-red-600">No se pudo cargar el dashboard.</p>;

  const { cards, recent, alerts } = data;
  const hasNoKnowledgeYet = cards.publishedCount === 0 && cards.pendingReviewCount === 0;

  return (
    <div className="space-y-6">
      <h1 className="flex items-center text-xl font-bold text-slate-800">
        Dashboard
        <InfoHint text="Solo datos y estadísticas de la Fuente de Conocimiento (RAG). Para crear o editar una fuente, revisar chunks o publicar, ve a 'Fuente de conocimiento' en el menú." />
      </h1>

      {hasNoKnowledgeYet && can('create_source') && (
        <div className="rounded-xl border border-brand-100 bg-brand-50 p-4">
          <p className="mb-3 text-sm text-brand-900">Todavía no hay conocimiento cargado.</p>
          <Button onClick={() => navigate('/knowledge/new')}>Cargar la primera fuente</Button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <StatCard
          label="Publicadas"
          value={cards.publishedCount}
          icon={<CheckCircle2 className="h-4 w-4" />}
          hint="Fuentes que ya pasaron por revisión y publicación, y que el chat de ACoreAI puede usar hoy para responder."
        />
        <StatCard
          label="Pendientes de revisión"
          value={cards.pendingReviewCount}
          tone="warning"
          icon={<Clock className="h-4 w-4" />}
          hint="Fuentes cargadas que todavía no fueron aprobadas ni rechazadas por un supervisor. No responden en el chat hasta publicarse."
        />
        <StatCard
          label="Vencidas"
          value={cards.expiredCount}
          tone="danger"
          icon={<AlertTriangle className="h-4 w-4" />}
          hint="Fuentes publicadas cuya fecha de 'vigente hasta' ya pasó. Siguen existiendo pero deberían revisarse o renovarse."
        />
        <StatCard
          label="Chunks publicados"
          value={cards.publishedChunksCount}
          icon={<Layers className="h-4 w-4" />}
          hint="Fragmentos de texto (no documentos completos) que están activos y disponibles para que el buscador del chat los recupere."
        />
        <StatCard
          label="Embeddings fallidos"
          value={cards.embeddingFailedCount}
          tone="danger"
          icon={<XCircle className="h-4 w-4" />}
          hint="Chunks aprobados a los que falló la generación del vector de embedding. Sin ese vector no se pueden recuperar en una búsqueda — hay que reintentar desde el paso Publicar."
        />
        <StatCard
          label="Preguntas sin respuesta"
          value={cards.unansweredQuestionsCount}
          tone="warning"
          icon={<HelpCircle className="h-4 w-4" />}
          hint="Preguntas de usuarios reales para las que el chat no encontró contexto suficiente. Son pistas de qué fuente falta cargar."
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Últimas fuentes cargadas" hint="Las fuentes más recientes, sin importar en qué estado estén (borrador, en revisión, publicada...).">
          <ul className="space-y-2 text-sm">
            {recent.sources.map((s) => (
              <li key={s.id} className="flex items-center justify-between gap-2">
                <Link to={`/knowledge/${s.id}`} className="truncate text-brand-700 hover:underline">
                  {s.title}
                </Link>
                <StatusBadge status={s.status} />
              </li>
            ))}
            {recent.sources.length === 0 && <li className="text-slate-400">Sin datos aún</li>}
          </ul>
        </Panel>

        <Panel title="Últimas revisiones" hint="Decisiones recientes de un supervisor: aprobado, rechazado o 'necesita cambios'.">
          <ul className="space-y-2 text-sm">
            {recent.reviews.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-2">
                <Link to={`/knowledge/${r.sourceId}`} className="truncate text-brand-700 hover:underline">
                  {r.sourceTitle}
                </Link>
                <StatusBadge status={r.decision} />
              </li>
            ))}
            {recent.reviews.length === 0 && <li className="text-slate-400">Sin datos aún</li>}
          </ul>
        </Panel>

        <Panel title="Últimas publicaciones" hint="Fuentes que pasaron a estado 'publicado' recientemente y ya están activas en el chat.">
          <ul className="space-y-2 text-sm">
            {recent.publications.map((p) => (
              <li key={p.id}>
                <Link to={`/knowledge/${p.id}`} className="truncate text-brand-700 hover:underline">
                  {p.title}
                </Link>
                <span className="ml-2 text-xs text-slate-400">{new Date(p.publishedAt).toLocaleDateString()}</span>
              </li>
            ))}
            {recent.publications.length === 0 && <li className="text-slate-400">Sin datos aún</li>}
          </ul>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel
          title="Documentos próximos a vencer"
          hint="Fuentes publicadas cuya fecha 'vigente hasta' está cerca — conviene revisarlas antes de que caduquen y dejen de responder correctamente."
        >
          <ul className="space-y-2 text-sm">
            {alerts.expiringSoon.map((s) => (
              <li key={s.id} className="flex justify-between">
                <Link to={`/knowledge/${s.id}`} className="text-brand-700 hover:underline">
                  {s.title}
                </Link>
                <span className="text-slate-500">{formatDateOnly(s.validUntil)}</span>
              </li>
            ))}
            {alerts.expiringSoon.length === 0 && <li className="text-slate-400">Nada próximo a vencer</li>}
          </ul>
        </Panel>

        <Panel
          title="Jobs fallidos"
          hint="Procesos automáticos (extracción de texto, generación de embeddings...) que fallaron y necesitan reintentarse manualmente."
        >
          <ul className="space-y-2 text-sm">
            {alerts.failedJobs.map((j) => (
              <li key={j.id} className="flex justify-between gap-2">
                <span className="truncate">
                  {j.jobType} — {j.sourceTitle ?? j.sourceId}
                </span>
                <span className="truncate text-xs text-red-600">{j.errorMessage}</span>
              </li>
            ))}
            {alerts.failedJobs.length === 0 && <li className="text-slate-400">Sin jobs fallidos</li>}
          </ul>
        </Panel>

        <Panel
          title="Publicadas sin fecha de vigencia"
          hint="Fuentes publicadas a las que nunca se les puso una fecha 'vigente hasta'. No vencen nunca automáticamente — revisa si eso es intencional."
        >
          <ul className="space-y-2 text-sm">
            {alerts.sourcesWithoutValidUntil.map((s) => (
              <li key={s.id}>
                <Link to={`/knowledge/${s.id}`} className="text-brand-700 hover:underline">
                  {s.title}
                </Link>
              </li>
            ))}
            {alerts.sourcesWithoutValidUntil.length === 0 && <li className="text-slate-400">Todo en orden</li>}
          </ul>
        </Panel>

        <Panel
          title="Fuentes duplicadas (mismo contenido)"
          hint="Fuentes distintas cuyo texto tiene exactamente el mismo checksum (contenido idéntico). Revisa si una debería archivarse para no confundir al chat."
        >
          <ul className="space-y-2 text-sm">
            {alerts.duplicateSources.map((s) => (
              <li key={s.id} className="flex justify-between">
                <Link to={`/knowledge/${s.id}`} className="text-brand-700 hover:underline">
                  {s.title}
                </Link>
                <StatusBadge status={s.status} />
              </li>
            ))}
            {alerts.duplicateSources.length === 0 && <li className="text-slate-400">Sin duplicados</li>}
          </ul>
        </Panel>
      </div>

      {getStoredUser()?.role === 'ADMIN' && <HistoryExportPanel />}
    </div>
  );
}
