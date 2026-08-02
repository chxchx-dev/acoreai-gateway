import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { Plus } from 'lucide-react';
import { automationProcessesApi } from '../lib/endpoints';
import { canAutomation } from '../lib/permissions';

export function AutomationStepsTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });
  const canManage = canAutomation('manage_process');

  const [key, setKey] = useState('');
  const [label, setLabel] = useState('');

  const addMutation = useMutation({
    mutationFn: () => automationProcessesApi.addStep(process.id, { key, label }),
    onSuccess: () => {
      invalidate();
      setKey('');
      setLabel('');
    },
  });
  const removeMutation = useMutation({
    mutationFn: (stepId: string) => automationProcessesApi.removeStep(stepId),
    onSuccess: invalidate,
  });

  return (
    <Panel
      title={
        <span className="flex items-center">
          Pasos de ejecución
          <InfoHint text="La secuencia ordenada de acciones que un ejecutor (hoy no existe todavía) debería seguir, ej. 'abrir_acoreai', 'iniciar_sesion', 'guardar_borrador'. Es la receta paso a paso del procedimiento." />
        </span>
      }
    >
      <div className="space-y-3">
        <ol className="space-y-2">
          {process.steps.map((step) => (
            <li key={step.id} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <span>
                <span className="mr-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-xs text-slate-500">
                  {step.order}
                </span>
                <code className="text-slate-500">{step.key}</code> — {step.label}
              </span>
              {canManage && (
                <button onClick={() => removeMutation.mutate(step.id)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              )}
            </li>
          ))}
          {process.steps.length === 0 && <li className="text-sm text-slate-400">Todavía no hay pasos definidos.</li>}
        </ol>

        {canManage && (
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Clave (ej. abrir_acoreai)</span>
              <input value={key} onChange={(e) => setKey(e.target.value)} className="input w-48" />
            </label>
            <label className="flex-1 text-sm">
              <span className="mb-1 block text-xs text-slate-500">Etiqueta (descripción corta)</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} className="input w-full" />
            </label>
            <Button onClick={() => addMutation.mutate()} disabled={!key || !label} loading={addMutation.isPending} icon={<Plus className="h-4 w-4" />}>
              Agregar paso
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
