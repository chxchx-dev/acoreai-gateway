import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { automationProcessesApi } from '../lib/endpoints';
import { canManageAutomation } from '../lib/permissions';
import { ApiError } from '../lib/api';

export function AutomationTemplatesTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });
  const canManage = canManageAutomation();

  const [name, setName] = useState('');
  const [payloadJson, setPayloadJson] = useState('{\n  \n}');
  const [error, setError] = useState<string | null>(null);

  const upsertMutation = useMutation({
    mutationFn: () => automationProcessesApi.upsertTemplate(process.id, { name, payload: JSON.parse(payloadJson) }),
    onSuccess: () => {
      invalidate();
      setName('');
      setPayloadJson('{\n  \n}');
      setError(null);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar la plantilla'),
  });
  const removeMutation = useMutation({
    mutationFn: (templateId: string) => automationProcessesApi.removeTemplate(templateId),
    onSuccess: invalidate,
  });

  function handleSave() {
    setError(null);
    try {
      JSON.parse(payloadJson);
    } catch {
      setError('El contenido del payload no es JSON válido');
      return;
    }
    if (!name) {
      setError('Ponle un nombre a la plantilla (ej. actividad_basica, actividad_con_adjunto)');
      return;
    }
    upsertMutation.mutate();
  }

  return (
    <Panel
      title={
        <span className="flex items-center">
          Plantillas de payload
          <InfoHint text="Ejemplos de datos ya armados que un futuro ejecutor podría enviar tal cual (o casi) para completar el proceso — sirven como referencia de 'así se ve un caso típico', no se ejecutan solos." />
        </span>
      }
    >
      <div className="space-y-3">
        {process.templates.map((template) => (
          <div key={template.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{template.name}</span>
              {canManage && (
                <button onClick={() => removeMutation.mutate(template.id)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              )}
            </div>
            <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
              {JSON.stringify(template.payload, null, 2)}
            </pre>
          </div>
        ))}
        {process.templates.length === 0 && <p className="text-sm text-slate-400">Todavía no hay plantillas definidas.</p>}

        {canManage && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Nombre (ej. actividad_basica)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} className="input w-64" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Payload (JSON)</span>
              <textarea
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
                rows={6}
                className="input w-full font-mono text-xs"
              />
            </label>
            <Button onClick={handleSave} loading={upsertMutation.isPending}>
              Guardar plantilla
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
