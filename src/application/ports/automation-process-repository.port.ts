import type { AutomationProcessesService } from 'src/modules/automation/automation-processes.service';

export const AUTOMATION_PROCESS_REPOSITORY_PORT = Symbol('AUTOMATION_PROCESS_REPOSITORY_PORT');

/** Import de solo-tipo: ver nota en language-profile-repository.port.ts. */
export type AutomationProcessRepositoryPort = Pick<
  AutomationProcessesService,
  | 'create'
  | 'findAll'
  | 'findOne'
  | 'update'
  | 'publish'
  | 'archive'
  | 'remove'
  | 'addStep'
  | 'updateStep'
  | 'removeStep'
  | 'addField'
  | 'updateField'
  | 'removeField'
  | 'upsertRule'
  | 'removeRule'
  | 'upsertTemplate'
  | 'removeTemplate'
  | 'addChecklistItem'
  | 'removeChecklistItem'
>;
