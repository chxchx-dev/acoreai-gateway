import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AutomationProcessesController } from 'src/interfaces/http/controllers/automation-processes.controller';
import { AutomationLogsController } from 'src/interfaces/http/controllers/automation-logs.controller';
import { AutomationProcessesService } from './automation-processes.service';
import { AutomationLogsService } from './automation-logs.service';
import { AutomationProcessRepositoryAdapter } from 'src/infrastructure/database/prisma/automation-process-repository.adapter';
import { AUTOMATION_PROCESS_REPOSITORY_PORT } from 'src/application/ports/automation-process-repository.port';
import { AutomationLogRepositoryAdapter } from 'src/infrastructure/database/prisma/automation-log-repository.adapter';
import { AUTOMATION_LOG_REPOSITORY_PORT } from 'src/application/ports/automation-log-repository.port';

@Module({
  imports: [AuthModule],
  controllers: [AutomationProcessesController, AutomationLogsController],
  providers: [
    AutomationProcessesService,
    AutomationLogsService,
    AutomationProcessRepositoryAdapter,
    { provide: AUTOMATION_PROCESS_REPOSITORY_PORT, useExisting: AutomationProcessRepositoryAdapter },
    AutomationLogRepositoryAdapter,
    { provide: AUTOMATION_LOG_REPOSITORY_PORT, useExisting: AutomationLogRepositoryAdapter },
  ],
  exports: [AUTOMATION_PROCESS_REPOSITORY_PORT, AUTOMATION_LOG_REPOSITORY_PORT],
})
export class AutomationModule {}
