import { SetMetadata } from '@nestjs/common';
import { AutomationAction } from 'src/domain/automation/automation-permissions';

export const AUTOMATION_ACTION_KEY = 'automationAction';

export const RequireAutomationAction = (action: AutomationAction) => SetMetadata(AUTOMATION_ACTION_KEY, action);
