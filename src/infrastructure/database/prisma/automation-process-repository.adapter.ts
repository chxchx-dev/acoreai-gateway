import { Injectable } from '@nestjs/common';
import { AutomationProcessesService } from 'src/modules/automation/automation-processes.service';
import { AutomationProcessRepositoryPort } from 'src/application/ports/automation-process-repository.port';

@Injectable()
export class AutomationProcessRepositoryAdapter implements AutomationProcessRepositoryPort {
  constructor(private readonly processes: AutomationProcessesService) {}

  create(...args: Parameters<AutomationProcessesService['create']>) {
    return this.processes.create(...args);
  }

  findAll(...args: Parameters<AutomationProcessesService['findAll']>) {
    return this.processes.findAll(...args);
  }

  findOne(...args: Parameters<AutomationProcessesService['findOne']>) {
    return this.processes.findOne(...args);
  }

  update(...args: Parameters<AutomationProcessesService['update']>) {
    return this.processes.update(...args);
  }

  publish(...args: Parameters<AutomationProcessesService['publish']>) {
    return this.processes.publish(...args);
  }

  archive(...args: Parameters<AutomationProcessesService['archive']>) {
    return this.processes.archive(...args);
  }

  remove(...args: Parameters<AutomationProcessesService['remove']>) {
    return this.processes.remove(...args);
  }

  addStep(...args: Parameters<AutomationProcessesService['addStep']>) {
    return this.processes.addStep(...args);
  }

  updateStep(...args: Parameters<AutomationProcessesService['updateStep']>) {
    return this.processes.updateStep(...args);
  }

  removeStep(...args: Parameters<AutomationProcessesService['removeStep']>) {
    return this.processes.removeStep(...args);
  }

  addField(...args: Parameters<AutomationProcessesService['addField']>) {
    return this.processes.addField(...args);
  }

  updateField(...args: Parameters<AutomationProcessesService['updateField']>) {
    return this.processes.updateField(...args);
  }

  removeField(...args: Parameters<AutomationProcessesService['removeField']>) {
    return this.processes.removeField(...args);
  }

  upsertRule(...args: Parameters<AutomationProcessesService['upsertRule']>) {
    return this.processes.upsertRule(...args);
  }

  removeRule(...args: Parameters<AutomationProcessesService['removeRule']>) {
    return this.processes.removeRule(...args);
  }

  upsertTemplate(...args: Parameters<AutomationProcessesService['upsertTemplate']>) {
    return this.processes.upsertTemplate(...args);
  }

  removeTemplate(...args: Parameters<AutomationProcessesService['removeTemplate']>) {
    return this.processes.removeTemplate(...args);
  }

  addChecklistItem(...args: Parameters<AutomationProcessesService['addChecklistItem']>) {
    return this.processes.addChecklistItem(...args);
  }

  removeChecklistItem(...args: Parameters<AutomationProcessesService['removeChecklistItem']>) {
    return this.processes.removeChecklistItem(...args);
  }
}
