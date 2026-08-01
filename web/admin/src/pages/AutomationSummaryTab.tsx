import { useOutletContext } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AutomationOutletContext } from './AutomationProcessDetailLayout';
import { Panel } from '../components/Card';
import { InfoHint } from '../components/InfoHint';
import { Button } from '../components/Button';
import { automationProcessesApi } from '../lib/endpoints';
import { canAutomation } from '../lib/permissions';

function PanelTitle({ children, hint }: { children: React.ReactNode; hint: string }) {
  return (
    <span className="flex items-center">
      {children}
      <InfoHint text={hint} />
    </span>
  );
}

export function AutomationSummaryTab() {
  const { process } = useOutletContext<AutomationOutletContext>();
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['automation-process', process.id] });

  const publishMutation = useMutation({ mutationFn: () => automationProcessesApi.publish(process.id), onSuccess: invalidate });
  const archiveMutation = useMutation({ mutationFn: () => automationProcessesApi.archive(process.id), onSuccess: invalidate });

  const canManage = canAutomation('manage_process');

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Panel
        title={<PanelTitle hint="Qué logra este proceso cuando se ejecute completo — sirve de contexto para quien lo revise o para un futuro ejecutor automático.">Objetivo</PanelTitle>}
      >
        <p className="text-sm text-slate-700">{process.objective || 'Sin objetivo definido todavía.'}</p>
      </Panel>

      <Panel title="Acciones">
        <div className="space-y-2">
          {canManage && process.status !== 'published' && (
            <Button className="w-full bg-green-600 hover:bg-green-700" onClick={() => publishMutation.mutate()} loading={publishMutation.isPending}>
              Publicar proceso
            </Button>
          )}
          {canManage && process.status !== 'archived' && (
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                if (confirm('¿Archivar este proceso?')) archiveMutation.mutate();
              }}
            >
              Archivar
            </Button>
          )}
          {!canManage && <p className="text-xs text-slate-400">Tu rol no tiene acciones disponibles sobre este proceso.</p>}
        </div>
      </Panel>

      <Panel
        title={
          <PanelTitle hint="Datos que SIEMPRE deben venir para poder ejecutar el proceso (ej. curso, fecha de entrega). Si falta alguna, el proceso no debería arrancar.">
            Entradas requeridas
          </PanelTitle>
        }
      >
        <TagList items={process.requiredInputs} empty="Sin entradas requeridas definidas." />
      </Panel>

      <Panel
        title={
          <PanelTitle hint="Datos que mejoran el resultado pero no son obligatorios (ej. rúbrica, instrucciones adicionales).">
            Entradas opcionales
          </PanelTitle>
        }
      >
        <TagList items={process.optionalInputs} empty="Sin entradas opcionales definidas." />
      </Panel>

      <Panel
        title={
          <PanelTitle hint="Reglas duras que el proceso nunca puede romper (ej. 'no publicar sin confirmación humana'). Distinto de la pestaña Reglas: esto es una lista corta de límites; las Reglas son configuración detallada por categoría.">
            Restricciones
          </PanelTitle>
        }
      >
        <TagList items={process.restrictions} empty="Sin restricciones definidas." />
      </Panel>
    </div>
  );
}

function TagList({ items, empty }: { items: string[]; empty: string }) {
  if (items.length === 0) return <p className="text-sm text-slate-400">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {items.map((item) => (
        <li key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
          {item}
        </li>
      ))}
    </ul>
  );
}
