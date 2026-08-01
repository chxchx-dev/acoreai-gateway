import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TtsController } from 'src/interfaces/http/controllers/tts.controller';
import { TtsService } from './tts.service';

@Module({
  imports: [AuthModule],
  controllers: [TtsController],
  providers: [TtsService],
})
export class TtsModule {}
