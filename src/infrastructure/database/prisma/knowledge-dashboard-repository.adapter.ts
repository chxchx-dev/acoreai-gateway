import { Injectable } from '@nestjs/common';
import { KnowledgeDashboardService } from 'src/modules/knowledge/knowledge-dashboard.service';
import { KnowledgeDashboardRepositoryPort } from 'src/application/ports/knowledge-dashboard-repository.port';

@Injectable()
export class KnowledgeDashboardRepositoryAdapter implements KnowledgeDashboardRepositoryPort {
  constructor(private readonly dashboard: KnowledgeDashboardService) {}

  getDashboard(...args: Parameters<KnowledgeDashboardService['getDashboard']>) {
    return this.dashboard.getDashboard(...args);
  }
}
