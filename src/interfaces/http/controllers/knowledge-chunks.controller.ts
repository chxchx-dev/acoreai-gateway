import { Body, Controller, Delete, HttpCode, HttpStatus, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { UpdateKnowledgeChunkDto } from '../dto/knowledge/update-knowledge-chunk.dto';
import { KnowledgeReviewService } from 'src/modules/knowledge/knowledge-review.service';
import { JwtPayload } from 'src/modules/auth/auth.service';

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@RequireKnowledgeAction('edit_chunk')
@Controller('knowledge/chunks')
export class KnowledgeChunksController {
  constructor(private readonly knowledgeReviewService: KnowledgeReviewService) {}

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeChunkDto, @Req() req: Request) {
    return this.knowledgeReviewService.updateChunk(id, dto, jwtUser(req).sub);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @Req() req: Request) {
    return this.knowledgeReviewService.approveChunk(id, jwtUser(req).sub);
  }

  @Post(':id/reject')
  reject(@Param('id') id: string, @Req() req: Request) {
    return this.knowledgeReviewService.rejectChunk(id, jwtUser(req).sub);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    return this.knowledgeReviewService.deleteChunk(id, jwtUser(req).sub);
  }
}
