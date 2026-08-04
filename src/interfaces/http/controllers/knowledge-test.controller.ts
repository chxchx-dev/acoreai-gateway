import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { TestQuestionDto, TestQuestionFeedbackDto } from '../dto/knowledge/test-question.dto';
import { KnowledgeTestService } from 'src/modules/knowledge/retrieval/knowledge-test.service';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('supervise_tools')
@Controller('knowledge/test-question')
export class KnowledgeTestController {
  constructor(private readonly knowledgeTestService: KnowledgeTestService) {}

  @Throttle({ default: { limit: 30, ttl: 3600000 } })
  @Post()
  test(@Body() dto: TestQuestionDto, @Req() req: Request) {
    return this.knowledgeTestService.testQuestion(dto.sourceId, dto.question, dto.model, jwtUser(req).sub);
  }

  @Post('feedback')
  feedback(@Body() dto: TestQuestionFeedbackDto, @Req() req: Request) {
    return this.knowledgeTestService.recordFeedback(dto.sourceId, dto.feedback, dto.question, jwtUser(req).sub);
  }
}
