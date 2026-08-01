import { Module } from '@nestjs/common';
import { AuthModule } from 'src/modules/auth/auth.module';
import { MongoModule } from 'src/infrastructure/database/mongodb/mongodb.module';
import { PrismaModule } from 'src/infrastructure/database/prisma/prisma.module';
import { ConversationsController } from 'src/interfaces/http/controllers/conversations.controller';
import { ConversationsMobileController } from 'src/interfaces/http/controllers/conversations-mobile.controller';
import { ConversationsService } from './conversations.service';

@Module({
  imports: [MongoModule, PrismaModule, AuthModule],
  controllers: [ConversationsController, ConversationsMobileController],
  providers: [ConversationsService],
  exports: [ConversationsService],
})
export class ConversationsModule {}
