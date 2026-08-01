import { Link, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { automationProcessesApi } from '../lib/endpoints';
import { StatusBadge } from '../components/StatusBadge';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { canAutomation } from '../lib/permissions';

export function AutomationProcessesListPage() {
  const navigate = useNavigate();
  const { data: processes, isLoading, error } = useQuery({ queryKey: ['automation-processes'], queryFn: automationProcessesApi.list });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center text-xl font-bold text-slate-800">
            Automatización de procesos
            <InfoHint text="Aquí defines PROCEDIMIENTOS EJECUTABLES (ej. 'crear una actividad en OLAN'), distinto de la Fuente de Conocimiento que solo responde preguntas. Por ahora esto es solo definición y gestión — todavía no hay un ejecutor real que entre a OLAN." />
          </h1>
          <p className="text-sm text-slate-500">Define pasos, campos, reglas y plantillas de un procedimiento antes de automatizarlo.</p>
        </div>
        {canAutomation('manage_process') && (
          <Button icon={<Plus className="h-4 w-4" />} onClick={() => navigate('/automation/new')}>
            Nuevo proceso
          </Button>
        )}
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando procesos...</p>}
      {error && <p className="text-sm text-red-600">No se pudieron cargar los procesos.</p>}

      {!isLoading && (processes ?? []).length === 0 && (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="text-sm font-medium text-slate-600">Todavía no hay ningún proceso definido.</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-400">
            Un proceso describe una tarea repetible (crear actividad, publicar nota...) con sus pasos, campos y reglas.
          </p>
          {canAutomation('manage_process') && (
            <Button className="mt-4" onClick={() => navigate('/automation/new')}>
              Crear el primer proceso
            </Button>
          )}
        </div>
      )}

      {!isLoading && (processes ?? []).length > 0 && (
        <Table>
          <Thead>
            <tr>
              <Th>Nombre</Th>
              <Th>Slug</Th>
              <Th>Plataforma</Th>
              <Th>Rol</Th>
              <Th>Estado</Th>
            </tr>
          </Thead>
          <Tbody>
            {(processes ?? []).map((p) => (
              <Tr key={p.id}>
                <Td>
                  <Link to={`/automation/${p.id}`} className="font-medium text-brand-700 hover:underline">
                    {p.name}
                  </Link>
                </Td>
                <Td className="text-slate-500">
                  <code>{p.slug}</code>
                </Td>
                <Td>{p.platform}</Td>
                <Td>{p.role ?? '—'}</Td>
                <Td>
                  <StatusBadge status={p.status} />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  );
}
