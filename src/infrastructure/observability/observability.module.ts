import { Global, Module } from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsInterceptor } from './metrics.interceptor';
import { ObservabilityService } from './observability.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [ObservabilityService, MetricsInterceptor],
  exports: [ObservabilityService, MetricsInterceptor],
})
export class ObservabilityModule {}
