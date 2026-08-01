import { Module } from '@nestjs/common';
import { AiOrchestratorModule } from 'src/modules/ai-orchestrator/ai-orchestrator.module';
import { ApplicationModule } from 'src/application/application.module';
import { AskQuestionUseCase } from 'src/application/use-cases/ask-question.usecase';
import { StreamChatUseCase } from 'src/application/use-cases/stream-chat.usecase';
import { StreamPerspectivesUseCase } from 'src/application/use-cases/stream-perspectives.usecase';
import { AuthModule } from 'src/modules/auth/auth.module';
import { ConversationsModule } from 'src/modules/conversations/conversations.module';
import { LogsModule } from 'src/modules/logs/logs.module';
import { RagModule } from 'src/modules/rag/rag.module';
import { ChatController } from 'src/interfaces/http/controllers/chat.controller';
import { ChatService } from './chat.service';
import { IntentClassifierService } from './intent-classifier.service';

@Module({
  imports: [
    ApplicationModule,
    AiOrchestratorModule,
    RagModule,
    ConversationsModule,
    AuthModule,
    LogsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, IntentClassifierService, AskQuestionUseCase, StreamChatUseCase, StreamPerspectivesUseCase],
  exports: [ChatService],
})
export class ChatModule {}
