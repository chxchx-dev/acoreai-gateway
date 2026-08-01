import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { AdminGuard } from '../guards/admin.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RagSearchDto } from '../dto/rag/rag-search.dto';
import { RagContextResult, RagService } from 'src/modules/rag/rag.service';

@UseGuards(ApiKeyGuard, JwtAuthGuard, AdminGuard)
@Controller('rag')
export class RagController {
  constructor(private readonly ragService: RagService) {}

  @Post('search')
  search(@Body() dto: RagSearchDto): Promise<RagContextResult> {
    return this.ragService.searchContext(dto.question);
  }
}
