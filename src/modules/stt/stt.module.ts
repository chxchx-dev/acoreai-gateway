import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { SttController } from 'src/interfaces/http/controllers/stt.controller';
import { SttService } from './stt.service';

@Module({
  imports: [AuthModule],
  controllers: [SttController],
  providers: [SttService],
})
export class SttModule {}
