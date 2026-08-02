import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { ConversationsController } from 'src/interfaces/http/controllers/conversations.controller';
import { ConversationsMobileController } from 'src/interfaces/http/controllers/conversations-mobile.controller';
import { ConversationsService } from './conversations.service';
import { ConversationRepositoryAdapter } from 'src/infrastructure/database/prisma/conversation-repository.adapter';
import { CONVERSATION_REPOSITORY_PORT } from 'src/application/ports/conversation-repository.port';

@Module({
  imports: [MongoModule, PrismaModule, AuthModule],
  controllers: [ConversationsController, ConversationsMobileController],
  providers: [
    ConversationsService,
    ConversationRepositoryAdapter,
    { provide: CONVERSATION_REPOSITORY_PORT, useExisting: ConversationRepositoryAdapter },
  ],
  exports: [CONVERSATION_REPOSITORY_PORT],
})
export class ConversationsModule {}
