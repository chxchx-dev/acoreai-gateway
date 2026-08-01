import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ModelPolicyService } from 'src/application/services/model-policy.service';
import { AskQuestionUseCase } from 'src/application/use-cases/ask-question.usecase';
import { StreamChatUseCase } from 'src/application/use-cases/stream-chat.usecase';
import { StreamPerspectivesUseCase } from 'src/application/use-cases/stream-perspectives.usecase';
import { AuthService } from 'src/modules/auth/auth.service';
import { ApiKeyOrJwtGuard } from '../guards/api-key-or-jwt.guard';
import { DeviceLockGuard } from '../guards/device-lock.guard';
import { ChatRequestDto } from '../dto/chat/chat-request.dto';
import { ChatResponseDto } from '../dto/chat/chat-response.dto';

@UseGuards(ApiKeyOrJwtGuard, DeviceLockGuard)
@Controller('chat')
export class ChatController {
  constructor(
    private readonly askQuestion: AskQuestionUseCase,
    private readonly streamChat: StreamChatUseCase,
    private readonly streamPerspectives: StreamPerspectivesUseCase,
    private readonly authService: AuthService,
    private readonly modelPolicy: ModelPolicyService,
  ) {}

  @Post()
  async ask(
    @Body() dto: ChatRequestDto,
    @Req() req: Request,
  ): Promise<ChatResponseDto> {
    const authContext = await this.authService.resolveRequestContext(req, dto.userId);
    const payload = this.modelPolicy.applyChatPolicy(
      { ...dto, userId: authContext.userId },
      {
        role: authContext.role,
        source: dto.source,
        authenticated: authContext.authenticated,
      },
    );

    return this.askQuestion.execute(payload);
  }

  @Post('stream')
  async stream(
    @Body() dto: ChatRequestDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    const authContext = await this.authService.resolveRequestContext(req, dto.userId);
    const payload = this.modelPolicy.applyChatPolicy(
      { ...dto, userId: authContext.userId },
      {
        role: authContext.role,
        source: dto.source,
        authenticated: authContext.authenticated,
      },
    );

    return this.streamChat.execute(payload, req, response);
  }

  @Post('perspectives/stream')
  async streamPerspectivesRoute(
    @Body() dto: ChatRequestDto,
    @Req() req: Request,
    @Res() response: Response,
  ): Promise<void> {
    const authContext = await this.authService.resolveRequestContext(req, dto.userId);
    const payload = this.modelPolicy.applyChatPolicy(
      { ...dto, userId: authContext.userId },
      {
        role: authContext.role,
        source: dto.source,
        authenticated: authContext.authenticated,
      },
    );

    return this.streamPerspectives.execute(payload, req, response);
  }
}
