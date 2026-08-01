import { useState } from 'react';
import { Panel } from './Card';
import { Button } from './Button';
import { historyApi } from '../lib/endpoints';
import { ApiError } from '../lib/api';

const SOURCE_OPTIONS = [
  { value: '', label: 'Todos los orígenes' },
  { value: 'rag_chat', label: 'Chat (/chat/rag)' },
  { value: 'rag_test', label: 'Prueba de pregunta' },
];

export function HistoryExportPanel() {
  const [source, setSource] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [downloading, setDownloading] = useState<'csv' | 'xlsx' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDownload(format: 'csv' | 'xlsx') {
    setError(null);
    setDownloading(format);
    try {
      await historyApi.download(format, {
        source: source || undefined,
        from: from || undefined,
        to: to || undefined,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'No se pudo descargar el historial');
    } finally {
      setDownloading(null);
    }
  }

  return (
    <Panel title="Historial de prompts (para tratamiento de datos)">
      <p className="mb-3 text-xs text-slate-400">
        Cada pregunta hecha al chat o probada antes de publicar, con su respuesta, modelo, fuentes y latencia. Vive en
        una base separada de la de conocimiento (Mongo), pensada para exportar y analizar.
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="text-xs">
          <span className="mb-1 block text-slate-500">Origen</span>
          <select value={source} onChange={(e) => setSource(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm">
            {SOURCE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-slate-500">Desde</span>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <label className="text-xs">
          <span className="mb-1 block text-slate-500">Hasta</span>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-lg border border-slate-300 px-2 py-1.5 text-sm" />
        </label>
        <Button variant="secondary" size="sm" onClick={() => handleDownload('csv')} disabled={downloading !== null} loading={downloading === 'csv'}>
          {downloading === 'csv' ? 'Descargando...' : 'Descargar CSV'}
        </Button>
        <Button size="sm" onClick={() => handleDownload('xlsx')} disabled={downloading !== null} loading={downloading === 'xlsx'}>
          {downloading === 'xlsx' ? 'Descargando...' : 'Descargar Excel'}
        </Button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </Panel>
  );
}
