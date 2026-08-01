import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService, HealthStatus } from 'src/modules/health/health.service';

@Controller()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  getRoot(): HealthStatus {
    return this.healthService.live();
  }

  @Get('health/live')
  getLive(): HealthStatus {
    return this.healthService.live();
  }

  @Get('health')
  async getHealth(@Res() res: Response): Promise<void> {
    await this.sendChecked(res, await this.healthService.ready());
  }

  @Get('health/ready')
  async getReady(@Res() res: Response): Promise<void> {
    await this.sendChecked(res, await this.healthService.ready());
  }

  @Get('health/deep')
  async getDeep(@Res() res: Response): Promise<void> {
    await this.sendChecked(res, await this.healthService.deep());
  }

  private async sendChecked(res: Response, health: HealthStatus): Promise<void> {
    res
      .status(health.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(health);
  }
}
