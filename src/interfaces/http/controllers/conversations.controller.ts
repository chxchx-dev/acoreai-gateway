import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload, UserRole } from 'src/modules/auth/auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { ConversationMessagesQueryDto } from '../dto/conversations/conversation-messages-query.dto';
import { ConversationsQueryDto } from '../dto/conversations/conversations-query.dto';
import { CreateConversationDto } from '../dto/conversations/create-conversation.dto';
import { UpdateConversationTitleDto } from '../dto/conversations/update-conversation-title.dto';
import {
  CONVERSATION_REPOSITORY_PORT,
  ConversationRepositoryPort,
} from 'src/application/ports/conversation-repository.port';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

function isAdmin(req: Request): boolean {
  return jwtUser(req).role === UserRole.ADMIN;
}

@UseGuards(JwtAuthGuard)
@Controller('conversations')
export class ConversationsController {
  constructor(
    @Inject(CONVERSATION_REPOSITORY_PORT)
    private readonly conversationsService: ConversationRepositoryPort,
  ) {}

  @Get()
  async findAll(@Query() query: ConversationsQueryDto, @Req() req: Request) {
    const user = jwtUser(req);
    return this.conversationsService.listConversations({
      ...query,
      userId: isAdmin(req) ? query.userId : user.sub,
    });
  }

  @Get(':id/messages')
  async findMessages(
    @Param('id') id: string,
    @Query() query: ConversationMessagesQueryDto,
    @Req() req: Request,
  ) {
    const user = jwtUser(req);
    return this.conversationsService.getConversationMessages(id, {
      ...query,
      userId: isAdmin(req) ? query.userId : user.sub,
    });
  }

  @Post()
  async create(@Body() dto: CreateConversationDto, @Req() req: Request) {
    const user = jwtUser(req);
    return this.conversationsService.createConversation({
      ...dto,
      userId: isAdmin(req) ? dto.userId ?? user.sub : user.sub,
    });
  }

  @Patch(':id/title')
  async updateTitle(
    @Param('id') id: string,
    @Body() dto: UpdateConversationTitleDto,
    @Req() req: Request,
  ) {
    const userId = isAdmin(req) ? undefined : jwtUser(req).sub;
    return this.conversationsService.updateConversationTitle(
      id,
      dto.title,
      userId,
    );
  }

  @Patch(':id/archive')
  async archive(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userId = isAdmin(req) ? undefined : jwtUser(req).sub;
    return this.conversationsService.archiveConversation(id, userId);
  }

  @Delete(':id')
  async remove(
    @Param('id') id: string,
    @Req() req: Request,
  ) {
    const userId = isAdmin(req) ? undefined : jwtUser(req).sub;
    return this.conversationsService.deleteConversation(id, userId);
  }
}
