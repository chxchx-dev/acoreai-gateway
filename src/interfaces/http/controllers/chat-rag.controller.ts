import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import { ChatService } from 'src/application/services/chat/chat.service';
import { ModelPolicyService } from 'src/application/services/model-policy.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { DeviceLockGuard } from '../guards/device-lock.guard';
import { ChatRagDto } from '../dto/knowledge/chat-rag.dto';

@UseGuards(ApiKeyOrJwtGuard, DeviceLockGuard)
@Controller('chat/rag')
export class ChatRagController {
  constructor(
    private readonly chatService: ChatService,
    private readonly authService: AuthService,
    private readonly modelPolicy: ModelPolicyService,
    private readonly config: ConfigService,
  ) {}

  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post()
  async ask(@Body() dto: ChatRagDto, @Req() req: Request) {
    const authContext = await this.authService.resolveRequestContext(req);
    const payload = this.modelPolicy.applyChatPolicy(
      {
        question: dto.message,
        conversationId: dto.sessionId,
        model: dto.model ?? this.config.get<string>('RAG_CHAT_MODEL'),
        source: 'rag_chat',
        userId: authContext.userId,
        area: dto.area,
        language: dto.language,
        useRag: true,
        requireKnowledge: true,
        useHistory: true,
      },
      {
        role: authContext.role,
        source: 'rag_chat',
        authenticated: authContext.authenticated,
      },
    );

    const result = await this.chatService.ask(payload);
    return {
      ...result,
      usedKnowledge: result.status === 'answered' && result.sources.length > 0,
      sources: result.sources.map((source) => ({
        title: source.title,
        page: source.page ?? null,
        section: source.section ?? null,
        score: source.score ?? 0,
      })),
    };
  }
}
