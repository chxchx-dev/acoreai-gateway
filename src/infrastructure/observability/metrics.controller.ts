import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import { ObservabilityService } from './observability.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly observability: ObservabilityService) {}

  @Get()
  async metrics(@Res() response: Response): Promise<void> {
    response.setHeader('Content-Type', this.observability.registry.contentType);
    response.send(await this.observability.registry.metrics());
  }
}
