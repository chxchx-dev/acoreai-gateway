import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { ChatRagDto } from '../dto/knowledge/chat-rag.dto';
import { KnowledgeChatService } from 'src/modules/knowledge/retrieval/knowledge-chat.service';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload | undefined {
  return (req as unknown as Record<string, JwtPayload | undefined>)['jwtUser'];
}

@UseGuards(ApiKeyOrJwtGuard)
@Controller('chat/rag')
export class ChatRagController {
  constructor(private readonly knowledgeChatService: KnowledgeChatService) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  ask(@Body() dto: ChatRagDto, @Req() req: Request) {
    return this.knowledgeChatService.ask({
      message: dto.message,
      area: dto.area,
      language: dto.language,
      model: dto.model,
      userId: jwtUser(req)?.sub,
    });
  }
}
