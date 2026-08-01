import { Injectable } from '@nestjs/common';
import { ChatService } from 'src/modules/chat/chat.service';
import { ChatRequest, ChatResponse } from '../contracts/chat.contract';

@Injectable()
export class AskQuestionUseCase {
  constructor(private readonly chatService: ChatService) {}

  execute(dto: ChatRequest): Promise<ChatResponse> {
    return this.chatService.ask(dto);
  }
}
