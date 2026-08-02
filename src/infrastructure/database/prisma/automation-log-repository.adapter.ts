import { Injectable } from '@nestjs/common';
import { AutomationLogsService } from 'src/modules/automation/automation-logs.service';
import { AutomationLogRepositoryPort } from 'src/application/ports/automation-log-repository.port';

@Injectable()
export class AutomationLogRepositoryAdapter implements AutomationLogRepositoryPort {
  constructor(private readonly logs: AutomationLogsService) {}

  list(...args: Parameters<AutomationLogsService['list']>) {
    return this.logs.list(...args);
  }

  create(...args: Parameters<AutomationLogsService['create']>) {
    return this.logs.create(...args);
  }

  remove(...args: Parameters<AutomationLogsService['remove']>) {
    return this.logs.remove(...args);
  }
}
