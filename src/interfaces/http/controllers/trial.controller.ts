import { Body, Controller, Post, Req, Res, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
import { ChatService } from 'src/modules/chat/chat.service';
import { TrialLimitGuard, TrialRequest } from '../guards/trial-limit.guard';
import { TrialChatRequestDto } from '../dto/trial/trial-chat-request.dto';
import { ChatResponseDto } from '../dto/chat/chat-response.dto';

const TRIAL_MAX_QUESTIONS = 3;

interface TrialChatResponse extends ChatResponseDto {
  questionsUsed: number;
  maxQuestions: number;
}

@UseGuards(TrialLimitGuard)
@Controller('trial')
export class TrialController {
  private readonly defaultModel: string;

  constructor(
    private readonly chatService: ChatService,
    private readonly config: ConfigService,
  ) {
    this.defaultModel = this.config.get<string>('TRIAL_DEFAULT_MODEL', 'alania');
  }

  @Post('chat')
  async ask(
    @Body() dto: TrialChatRequestDto,
    @Req() req: TrialRequest,
  ): Promise<TrialChatResponse> {
    const result = await this.chatService.ask({
      ...dto,
      model: this.defaultModel,
      source: 'landing-trial',
      useHistory: true,
      useRag: false,
    });

    return {
      ...result,
      questionsUsed: req.trialQuestionsUsed ?? 1,
      maxQuestions: TRIAL_MAX_QUESTIONS,
    };
  }

  @Post('chat/stream')
  async stream(
    @Body() dto: TrialChatRequestDto,
    @Req() req: TrialRequest,
    @Res() response: Response,
  ): Promise<void> {
    response.setHeader('X-Trial-Questions-Used', String(req.trialQuestionsUsed ?? 1));
    response.setHeader('X-Trial-Max-Questions', String(TRIAL_MAX_QUESTIONS));

    return this.chatService.stream(
      {
        ...dto,
        model: this.defaultModel,
        source: 'landing-trial',
        useHistory: true,
        useRag: false,
      },
      req,
      response,
    );
  }
}
