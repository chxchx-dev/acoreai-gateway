import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { StatusBadge } from '../components/StatusBadge';
import { Button } from '../components/Button';
import { Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { automationLogsApi } from '../lib/endpoints';
import { canAutomation } from '../lib/permissions';
import { ApiError } from '../lib/api';

export function AutomationLogsTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const canManage = canAutomation('manage_logs');

  const { data: logs, isLoading } = useQuery({
    queryKey: ['automation-logs', process.id],
    queryFn: () => automationLogsApi.list(process.id),
  });

  const [status, setStatus] = useState<'pending' | 'success' | 'error'>('pending');
  const [inputJson, setInputJson] = useState('{\n  \n}');
  const [errorMessage, setErrorMessage] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-logs', process.id] });

  const createMutation = useMutation({
    mutationFn: () =>
      automationLogsApi.create(process.id, {
        status,
        inputPayload: JSON.parse(inputJson),
        errorMessage: errorMessage || undefined,
      }),
    onSuccess: () => {
      invalidate();
      setInputJson('{\n  \n}');
      setErrorMessage('');
      setFormError(null);
    },
    onError: (err: unknown) => setFormError(err instanceof ApiError ? err.message : 'No se pudo registrar el log'),
  });
  const removeMutation = useMutation({ mutationFn: (logId: string) => automationLogsApi.remove(logId), onSuccess: invalidate });

  function handleCreate() {
    setFormError(null);
    try {
      JSON.parse(inputJson);
    } catch {
      setFormError('El payload de entrada no es JSON válido');
      return;
    }
    createMutation.mutate();
  }

  return (
    <Panel
      title={
        <span className="flex items-center">
          Logs de ejecución
          <InfoHint text="Historial de intentos de ejecutar este proceso. Hoy no hay un ejecutor real (bot) que entre a ACOREAI, así que estos registros se crean a mano mientras se hacen pruebas — cuando exista el ejecutor, los creará automáticamente." />
        </span>
      }
    >
      <div className="space-y-3">
        {isLoading && <p className="text-sm text-slate-500">Cargando logs...</p>}

        <div className="overflow-x-auto rounded-lg border border-slate-200">
          <table className="min-w-full divide-y divide-slate-100 text-sm">
            <Thead>
              <tr>
                <Th>Estado</Th>
                <Th>Entrada</Th>
                <Th>Error</Th>
                <Th>Fecha</Th>
                {canManage && <Th />}
              </tr>
            </Thead>
            <Tbody>
              {(logs ?? []).map((log) => (
                <Tr key={log.id}>
                  <Td>
                    <StatusBadge status={log.status} />
                  </Td>
                  <Td className="max-w-xs truncate text-xs text-slate-600">{JSON.stringify(log.inputPayload)}</Td>
                  <Td className="text-xs text-red-600">{log.errorMessage ?? '—'}</Td>
                  <Td className="text-xs text-slate-400">{new Date(log.startedAt).toLocaleString()}</Td>
                  {canManage && (
                    <Td className="text-right">
                      <button onClick={() => removeMutation.mutate(log.id)} className="text-xs text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </Td>
                  )}
                </Tr>
              ))}
              {!isLoading && (logs ?? []).length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-4 text-center text-slate-400">
                    Sin logs todavía — normal mientras no exista un ejecutor real.
                  </Td>
                </tr>
              )}
            </Tbody>
          </table>
        </div>

        {canManage && (
          <div className="space-y-2 border-t border-slate-100 pt-3">
            <p className="text-xs text-slate-400">Registrar un log manualmente (útil mientras pruebas el proceso a mano):</p>
            {formError && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">{formError}</div>}
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="mb-1 block text-xs text-slate-500">Estado</span>
                <select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="input">
                  <option value="pending">pending</option>
                  <option value="success">success</option>
                  <option value="error">error</option>
                </select>
              </label>
              <label className="flex-1 text-sm">
                <span className="mb-1 block text-xs text-slate-500">Mensaje de error (opcional)</span>
                <input value={errorMessage} onChange={(e) => setErrorMessage(e.target.value)} className="input w-full" />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block text-xs text-slate-500">Payload de entrada (JSON)</span>
              <textarea
                value={inputJson}
                onChange={(e) => setInputJson(e.target.value)}
                rows={4}
                className="input w-full font-mono text-xs"
              />
            </label>
            <Button onClick={handleCreate} loading={createMutation.isPending}>
              Registrar log
            </Button>
          </div>
        )}
      </div>
    </Panel>
  );
}
