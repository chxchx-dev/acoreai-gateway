import { Injectable } from '@nestjs/common';
import { Request, Response } from 'express';
import { ChatService } from 'src/modules/chat/chat.service';
import { ChatRequest } from '../contracts/chat.contract';

@Injectable()
export class StreamChatUseCase {
  constructor(private readonly chatService: ChatService) {}

  execute(dto: ChatRequest, req: Request, response: Response): Promise<void> {
    return this.chatService.stream(dto, req, response);
  }
}
