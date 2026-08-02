import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TtsController } from 'src/interfaces/http/controllers/tts.controller';
import { TtsService } from './tts.service';
import { TtsAdapter } from 'src/infrastructure/tts/tts.adapter';
import { TTS_PORT } from 'src/application/ports/tts.port';

@Module({
  imports: [AuthModule],
  controllers: [TtsController],
  providers: [
    TtsService,
    TtsAdapter,
    { provide: TTS_PORT, useExisting: TtsAdapter },
  ],
})
export class TtsModule {}
