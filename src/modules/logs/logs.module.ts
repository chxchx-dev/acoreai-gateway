import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { LogsController } from 'src/interfaces/http/controllers/logs.controller';
import { LogsService } from './logs.service';
import { ChatLogRepositoryAdapter } from 'src/infrastructure/database/mongodb/chat-log-repository.adapter';
import { CHAT_LOG_REPOSITORY_PORT } from 'src/application/ports/chat-log-repository.port';

@Module({
  imports: [AuthModule, MongoModule],
  controllers: [LogsController],
  providers: [
    LogsService,
    ChatLogRepositoryAdapter,
    { provide: CHAT_LOG_REPOSITORY_PORT, useExisting: ChatLogRepositoryAdapter },
  ],
  exports: [CHAT_LOG_REPOSITORY_PORT],
})
export class LogsModule {}
