import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { LogsController } from 'src/interfaces/http/controllers/logs.controller';
import { LogsService } from './logs.service';

@Module({
  imports: [AuthModule, MongoModule],
  controllers: [LogsController],
  providers: [LogsService],
  exports: [LogsService],
})
export class LogsModule {}
