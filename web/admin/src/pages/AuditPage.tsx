import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { auditApi } from '../lib/endpoints';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Button } from '../components/Button';

export function AuditPage() {
  const [action, setAction] = useState('');
  const [entityId, setEntityId] = useState('');
  const [userId, setUserId] = useState('');
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['audit', { action, entityId, userId, page }],
    queryFn: () => auditApi.list({ action: action || undefined, entityId: entityId || undefined, userId: userId || undefined, page, pageSize: 30 }),
  });

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Auditoría</h1>

      <div className="flex flex-wrap gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-card">
        <input value={action} onChange={(e) => { setAction(e.target.value); setPage(1); }} placeholder="Acción (ej. source.approved)" className="input max-w-xs" />
        <input value={entityId} onChange={(e) => { setEntityId(e.target.value); setPage(1); }} placeholder="ID de entidad" className="input max-w-xs" />
        <input value={userId} onChange={(e) => { setUserId(e.target.value); setPage(1); }} placeholder="ID de usuario" className="input max-w-xs" />
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>Fecha</Th>
                <Th>Usuario</Th>
                <Th>Acción</Th>
                <Th>Entidad</Th>
                <Th>Antes</Th>
                <Th>Después</Th>
                <Th>IP</Th>
              </tr>
            </Thead>
            <Tbody>
              {data.items.map((log) => (
                <Tr key={log.id}>
                  <Td className="whitespace-nowrap text-slate-500">{new Date(log.createdAt).toLocaleString()}</Td>
                  <Td>{log.userId ?? '—'}</Td>
                  <Td className="font-medium">{log.action}</Td>
                  <Td className="text-slate-500">
                    {log.entityType} <span className="text-xs text-slate-400">{log.entityId.slice(0, 8)}</span>
                  </Td>
                  <Td className="max-w-xs truncate text-xs text-slate-500">{log.oldValue ? JSON.stringify(log.oldValue) : '—'}</Td>
                  <Td className="max-w-xs truncate text-xs text-slate-500">{log.newValue ? JSON.stringify(log.newValue) : '—'}</Td>
                  <Td className="text-slate-400">{log.ipAddress ?? '—'}</Td>
                </Tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td colSpan={7} className="py-6 text-center text-slate-400">
                    Sin resultados.
                  </Td>
                </tr>
              )}
            </Tbody>
          </Table>

          <div className="flex items-center justify-between px-1 text-xs text-slate-500">
            <span>
              Página {data.page} — {data.total} registros
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} icon={<ChevronLeft className="h-3.5 w-3.5" />}>
                Anterior
              </Button>
              <Button
                size="sm"
                variant="secondary"
                disabled={page * data.pageSize >= data.total}
                onClick={() => setPage((p) => p + 1)}
              >
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
