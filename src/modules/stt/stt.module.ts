import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SttController } from 'src/interfaces/http/controllers/stt.controller';
import { SttService } from './stt.service';
import { SttAdapter } from 'src/infrastructure/stt/stt.adapter';
import { STT_PORT } from 'src/application/ports/stt.port';

@Module({
  imports: [AuthModule],
  controllers: [SttController],
  providers: [
    SttService,
    SttAdapter,
    { provide: STT_PORT, useExisting: SttAdapter },
  ],
})
export class SttModule {}
