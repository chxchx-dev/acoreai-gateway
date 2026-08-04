import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { automationProcessesApi } from '../lib/endpoints';
import { canAutomation } from '../lib/permissions';
import { ApiError } from '../lib/api';

export function AutomationRulesTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });
  const canManage = canAutomation('manage_process');

  const [categoria, setCategoria] = useState('');
  const [reglasJson, setReglasJson] = useState('{\n  \n}');
  const [error, setError] = useState<string | null>(null);

  const upsertMutation = useMutation({
    mutationFn: () => automationProcessesApi.upsertRule(process.id, { categoria, reglas: JSON.parse(reglasJson) }),
    onSuccess: () => {
      invalidate();
      setCategoria('');
      setReglasJson('{\n  \n}');
      setError(null);
    },
    onError: (err: unknown) => setError(err instanceof ApiError ? err.message : 'No se pudo guardar la regla'),
  });
  const removeMutation = useMutation({ mutationFn: (ruleId: string) => automationProcessesApi.removeRule(ruleId), onSuccess: invalidate });

  function handleSave() {
    setError(null);
    try {
      JSON.parse(reglasJson);
    } catch {
      setError('El contenido de reglas no es JSON válido');
      return;
    }
    if (!categoria) {
      setError('Ponle un nombre de categoría (ej. fechas, puntaje, adjuntos)');
      return;
    }
    upsertMutation.mutate();
  }

  return (
    <Panel
      title={
        <span className="flex items-center">
          Reglas de validación
          <InfoHint text="Configuración detallada por categoría (fechas, publicación, puntaje, adjuntos...) que el proceso debe cumplir antes de ejecutarse. Cada categoría es un bloque JSON libre para no forzar una estructura rígida — distinto de Restricciones (lista corta de límites duros en el Resumen)." />
        </span>
      }
    >
      <div className="space-y-3">
        {process.rules.map((rule) => (
          <div key={rule.id} className="rounded-lg border border-slate-200 p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">{rule.categoria}</span>
              {canManage && (
                <button onClick={() => removeMutation.mutate(rule.id)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              )}
            </div>
            <pre className="overflow-x-auto rounded bg-slate-50 p-2 text-xs text-slate-700">
              {JSON.stringify(rule.reglas, null, 2)}
            </pre>
          </div>
        ))}
        {process.rules.length === 0 && <p className="text-sm text-slate-400">Todavía no hay reglas definidas.</p>}

        {canManage && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Categoría (ej. fechas, puntaje, adjuntos)</span>
              <input value={categoria} onChange={(e) => setCategoria(e.target.value)} className="input w-64" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Reglas (JSON)</span>
              <textarea
                value={reglasJson}
                onChange={(e) => setReglasJson(e.target.value)}
                rows={6}
                className="input w-full font-mono text-xs"
              />
            </label>
            <Button onClick={handleSave} loading={upsertMutation.isPending}>
              Guardar regla
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
