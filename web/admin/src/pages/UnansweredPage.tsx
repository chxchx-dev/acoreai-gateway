import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { unansweredApi } from '../lib/endpoints';
import { Table, Thead, Tbody, Tr, Th, Td } from '../components/Table';
import { Button } from '../components/Button';

export function UnansweredPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ['unanswered', page],
    queryFn: () => unansweredApi.list(page, 30),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Preguntas sin respuesta</h1>
        <p className="text-sm text-slate-500">
          Preguntas de /chat/rag y /knowledge/search donde no se encontró contexto publicado suficiente.
        </p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Cargando...</p>}

      {data && (
        <>
          <Table>
            <Thead>
              <tr>
                <Th>Pregunta</Th>
                <Th>Usuario</Th>
                <Th>Área</Th>
                <Th>Fecha</Th>
                <Th>Acción sugerida</Th>
              </tr>
            </Thead>
            <Tbody>
              {data.items.map((log) => (
                <Tr key={log.id}>
                  <Td className="font-medium">{log.query}</Td>
                  <Td className="text-slate-500">{log.userId ?? 'anónimo'}</Td>
                  <Td className="text-slate-500">{log.filters?.area ?? '—'}</Td>
                  <Td className="whitespace-nowrap text-slate-400">{new Date(log.createdAt).toLocaleString()}</Td>
                  <Td>
                    <button
                      onClick={() => navigate('/knowledge/new', { state: { title: log.query } })}
                      className="text-xs text-brand-700 hover:underline"
                    >
                      Crear fuente desde pregunta
                    </button>
                  </Td>
                </Tr>
              ))}
              {data.items.length === 0 && (
                <tr>
                  <Td colSpan={5} className="py-6 text-center text-slate-400">
                    No hay preguntas sin respuesta registradas.
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
              <Button size="sm" variant="secondary" disabled={page * data.pageSize >= data.total} onClick={() => setPage((p) => p + 1)}>
                Siguiente
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </>
      )}

      <p className="text-xs text-slate-400">
        "Asignar a supervisor" y "Marcar como no aplica" quedan pendientes: requieren agregar estado persistente a este
        log, que no existe todavía en el modelo de datos.
      </p>
    </div>
  );
}
