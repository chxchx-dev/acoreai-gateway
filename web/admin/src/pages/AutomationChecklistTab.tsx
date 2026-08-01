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
import type { AutomationChecklistItem } from '../lib/types';

function ChecklistColumn({
  title,
  hint,
  momento,
  items,
  canManage,
  onAdd,
  onRemove,
}: {
  title: string;
  hint: string;
  momento: 'antes' | 'despues';
  items: AutomationChecklistItem[];
  canManage: boolean;
  onAdd: (momento: 'antes' | 'despues', label: string) => void;
  onRemove: (id: string) => void;
}) {
  const [label, setLabel] = useState('');

  return (
    <Panel
      title={
        <span className="flex items-center">
          {title}
          <InfoHint text={hint} />
        </span>
      }
    >
      <div className="space-y-2">
        <ul className="space-y-1.5 text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2">
              <span>☐ {item.label}</span>
              {canManage && (
                <button onClick={() => onRemove(item.id)} className="text-xs text-red-600 hover:underline">
                  Eliminar
                </button>
              )}
            </li>
          ))}
          {items.length === 0 && <li className="text-slate-400">Sin ítems todavía.</li>}
        </ul>

        {canManage && (
          <div className="flex gap-2 border-t border-slate-100 pt-2">
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Nuevo ítem..."
              className="input flex-1 text-sm"
            />
            <Button
              size="sm"
              icon={<Plus className="h-3.5 w-3.5" />}
              onClick={() => {
                if (!label) return;
                onAdd(momento, label);
                setLabel('');
              }}
            >
              Agregar
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}

export function AutomationChecklistTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });
  const canManage = canAutomation('manage_process');

  const addMutation = useMutation({
    mutationFn: ({ momento, label }: { momento: 'antes' | 'despues'; label: string }) =>
      automationProcessesApi.addChecklistItem(process.id, { momento, label }),
    onSuccess: invalidate,
  });
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => automationProcessesApi.removeChecklistItem(itemId),
    onSuccess: invalidate,
  });

  const antes = process.checklist.filter((i) => i.momento === 'antes');
  const despues = process.checklist.filter((i) => i.momento === 'despues');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <ChecklistColumn
        title="Antes de guardar"
        hint="Cosas que hay que revisar ANTES de ejecutar la acción final (ej. 'curso correcto', 'archivo adjunto correcto')."
        momento="antes"
        items={antes}
        canManage={canManage}
        onAdd={(momento, label) => addMutation.mutate({ momento, label })}
        onRemove={(id) => removeMutation.mutate(id)}
      />
      <ChecklistColumn
        title="Después de guardar"
        hint="Cosas que hay que verificar DESPUÉS de ejecutar la acción, para confirmar que quedó bien hecha (ej. 'aparece en borradores', 'no se publicó sin confirmación')."
        momento="despues"
        items={despues}
        canManage={canManage}
        onAdd={(momento, label) => addMutation.mutate({ momento, label })}
        onRemove={(id) => removeMutation.mutate(id)}
      />
    </div>
  );
}
