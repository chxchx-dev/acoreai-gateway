import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { AutomationProcessesController } from 'src/interfaces/http/controllers/automation-processes.controller';
import { AutomationLogsController } from 'src/interfaces/http/controllers/automation-logs.controller';
import { AutomationProcessesService } from './automation-processes.service';
import { AutomationLogsService } from './automation-logs.service';

@Module({
  imports: [AuthModule],
  controllers: [AutomationProcessesController, AutomationLogsController],
  providers: [AutomationProcessesService, AutomationLogsService],
  exports: [AutomationProcessesService, AutomationLogsService],
})
export class AutomationModule {}
