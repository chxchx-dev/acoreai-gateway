import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { DeviceLockGuard } from '../guards/device-lock.guard';
import { ConversationsService } from 'src/modules/conversations/conversations.service';

/**
 * Conversation endpoints for the mobile app.
 * Protected by API key only (no JWT). The caller must supply userId as a
 * query param — the gateway uses it directly without token validation.
 */
@UseGuards(ApiKeyGuard, DeviceLockGuard)
@Controller('conversations/app')
export class ConversationsMobileController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get()
  listApp(
    @Query('userId') userId: string,
    @Query('status') status: string,
    @Query('limit') limit: string,
    @Query('sourcePrefix') sourcePrefix: string,
  ) {
    if (!userId) throw new BadRequestException('userId requerido');
    return this.conversationsService.listConversations({
      userId,
      status: (status as 'active' | 'archived' | 'all') ?? 'active',
      limit: limit ? Number(limit) : 20,
      ...(sourcePrefix ? { sourcePrefix } : {}),
    });
  }

  @Get(':id/messages')
  messagesApp(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Query('limit') limit: string,
  ) {
    if (!userId) throw new BadRequestException('userId requerido');
    return this.conversationsService.getConversationMessages(id, {
      userId,
      limit: limit ? Number(limit) : 200,
    });
  }

  @Patch(':id/title')
  renameApp(
    @Param('id') id: string,
    @Query('userId') userId: string,
    @Body('title') titleBody: string,
    @Query('title') titleQuery: string,
  ) {
    if (!userId) throw new BadRequestException('userId requerido');
    const title = titleBody || titleQuery;
    if (!title) throw new BadRequestException('title requerido');
    return this.conversationsService.updateConversationTitle(id, title, userId);
  }

  @Delete(':id')
  deleteApp(
    @Param('id') id: string,
    @Query('userId') userId: string,
  ) {
    if (!userId) throw new BadRequestException('userId requerido');
    return this.conversationsService.deleteConversation(id, userId);
  }
}
