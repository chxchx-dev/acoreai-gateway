import type { AutomationLogsService } from 'src/modules/automation/automation-logs.service';

export const AUTOMATION_LOG_REPOSITORY_PORT = Symbol('AUTOMATION_LOG_REPOSITORY_PORT');

export type AutomationLogRepositoryPort = Pick<
  AutomationLogsService,
  'list' | 'create' | 'remove'
>;
