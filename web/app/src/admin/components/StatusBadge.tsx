export const STATUS_LABELS: Record<string, string> = {
  draft: 'Borrador',
  pending_extraction: 'Pendiente extracción',
  extracted: 'Extraído',
  chunked: 'Chunked',
  pending_review: 'Pendiente de revisión',
  needs_changes: 'Necesita cambios',
  approved: 'Aprobado',
  embedding_pending: 'Generando embeddings',
  embedding_failed: 'Embeddings fallidos',
  ready_to_publish: 'Listo para publicar',
  published: 'Publicado',
  rejected: 'Rechazado',
  archived: 'Archivado',
  expired: 'Vencido',
  queued: 'En cola',
  running: 'Corriendo',
  completed: 'Completado',
  failed: 'Fallido',
  cancelled: 'Cancelado',
  pending: 'Pendiente',
  success: 'Exitoso',
  error: 'Error',
};

const DOT_COLORS: Record<string, string> = {
  draft: 'bg-slate-400',
  pending_extraction: 'bg-amber-500',
  extracted: 'bg-amber-500',
  chunked: 'bg-amber-500',
  pending_review: 'bg-blue-500',
  needs_changes: 'bg-orange-500',
  approved: 'bg-teal-500',
  embedding_pending: 'bg-blue-500',
  embedding_failed: 'bg-red-500',
  ready_to_publish: 'bg-indigo-500',
  published: 'bg-green-500',
  rejected: 'bg-red-500',
  archived: 'bg-slate-400',
  expired: 'bg-red-500',
  queued: 'bg-slate-400',
  running: 'bg-blue-500',
  completed: 'bg-green-500',
  failed: 'bg-red-500',
  cancelled: 'bg-slate-400',
  pending: 'bg-slate-400',
  success: 'bg-green-500',
  error: 'bg-red-500',
};

export function StatusBadge({ status }: { status: string }) {
  const dot = DOT_COLORS[status] ?? 'bg-slate-400';
  const label = STATUS_LABELS[status] ?? status;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700">
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
