import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RagSearchDto } from '../dto/rag/rag-search.dto';
import { JwtPayload } from 'src/modules/auth/auth.service';
import { RagContextResult, RagService } from 'src/modules/rag/rag.service';

@UseGuards(ApiKeyGuard, JwtAuthGuard, AdminGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('search')
  search(@Body() dto: RagSearchDto, @Req() req: Request): Promise<RagContextResult> {
    const jwtUser = (req as unknown as Record<string, JwtPayload | undefined>)['jwtUser'];
    return this.ragService.searchContext(dto.question, jwtUser?.sub);
  }
}
