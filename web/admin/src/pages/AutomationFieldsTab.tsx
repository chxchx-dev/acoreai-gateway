import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Plus } from 'lucide-react';
import { automationProcessesApi } from '../lib/endpoints';
import { canAutomation } from '../lib/permissions';

const FIELD_TYPES = ['select', 'text', 'textarea', 'date', 'time', 'number', 'file'] as const;

export function AutomationFieldsTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });
  const canManage = canAutomation('manage_process');

  const [key, setKey] = useState('');
  const [tipo, setTipo] = useState<(typeof FIELD_TYPES)[number]>('text');
  const [requerido, setRequerido] = useState(true);

  const addMutation = useMutation({
    mutationFn: () => automationProcessesApi.addField(process.id, { key, tipo, requerido }),
    onSuccess: () => {
      invalidate();
      setKey('');
    },
  });
  const removeMutation = useMutation({
    mutationFn: (fieldId: string) => automationProcessesApi.removeField(fieldId),
    onSuccess: invalidate,
  });

  return (
    <Panel
      title={
        <span className="flex items-center">
          Campos del formulario
          <InfoHint text="Los campos que hay que llenar en la pantalla de destino (OLAN) para completar el proceso, con su tipo de control (select, texto, fecha...) y si son obligatorios." />
        </span>
      }
    >
      <div className="space-y-3">
        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <Thead>
              <tr>
                <Th>Clave</Th>
                <Th>Tipo</Th>
                <Th>Requerido</Th>
                {canManage && <Th />}
              </tr>
            </Thead>
            <Tbody>
              {process.fields.map((field) => (
                <Tr key={field.id}>
                  <Td>
                    <code>{field.key}</code>
                  </Td>
                  <Td>{field.tipo}</Td>
                  <Td>{field.requerido ? 'Sí' : 'No'}</Td>
                  {canManage && (
                    <Td className="text-right">
                      <button onClick={() => removeMutation.mutate(field.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </Td>
                  )}
                </Tr>
              ))}
              {process.fields.length === 0 && (
                <tr>
                  <Td colSpan={4} className="py-4 text-center text-slate-400">
                    Todavía no hay campos definidos.
                  </Td>
                </tr>
              )}
            </Tbody>
          </table>
        </div>

        {canManage && (
          <div className="flex flex-wrap items-end gap-2 border-t border-slate-100 pt-3">
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Clave (ej. fecha_entrega)</span>
              <input value={key} onChange={(e) => setKey(e.target.value)} className="input w-48" />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-xs text-slate-500">Tipo</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value as (typeof FIELD_TYPES)[number])} className="input">
                {FIELD_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={requerido} onChange={(e) => setRequerido(e.target.checked)} />
              Requerido
            </label>
            <Button onClick={() => addMutation.mutate()} disabled={!key} loading={addMutation.isPending} icon={<Plus className="h-4 w-4" />}>
              Agregar campo
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
