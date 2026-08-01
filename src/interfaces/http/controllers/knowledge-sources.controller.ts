import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard, resolveKnowledgeRole } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { CreateKnowledgeSourceDto } from '../dto/knowledge/create-knowledge-source.dto';
import { UpdateKnowledgeSourceDto } from '../dto/knowledge/update-knowledge-source.dto';
import { CreateKnowledgeVersionDto } from '../dto/knowledge/create-knowledge-version.dto';
import { CreateKnowledgeReviewDto } from '../dto/knowledge/create-knowledge-review.dto';
import { ArchiveKnowledgeSourceDto } from '../dto/knowledge/archive-knowledge-source.dto';
import { KnowledgeSourcesService } from 'src/modules/knowledge/knowledge-sources.service';
import { KnowledgeReviewService } from 'src/modules/knowledge/knowledge-review.service';
import { KnowledgePublishingService } from 'src/modules/knowledge/knowledge-publishing.service';
import { JwtPayload, KnowledgeRole } from 'src/modules/auth/auth.service';

interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

function jwtUser(req: Request): JwtPayload {
  return (req as unknown as Record<string, JwtPayload>)['jwtUser'];
}

const ALLOWED_UPLOAD_EXTENSIONS = ['.txt', '.md', '.csv'];
const FULL_ACCESS_ROLES = [KnowledgeRole.SUPER_ADMIN, KnowledgeRole.TENANT_ADMIN];

@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@Controller('knowledge/sources')
export class KnowledgeSourcesController {
  constructor(
    private readonly knowledgeSourcesService: KnowledgeSourcesService,
    private readonly knowledgeReviewService: KnowledgeReviewService,
    private readonly knowledgePublishingService: KnowledgePublishingService,
  ) {}

  // Fase 7: 10 cargas/hora por usuario.
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post()
  @RequireKnowledgeAction('create_source')
  create(@Body() dto: CreateKnowledgeSourceDto, @Req() req: Request) {
    return this.knowledgeSourcesService.create(dto, jwtUser(req).sub);
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post('upload')
  @RequireKnowledgeAction('create_source')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB, suficiente para TXT/MD
    }),
  )
  createFromUpload(
    @UploadedFile() file: MulterFile,
    @Body() dto: Omit<CreateKnowledgeSourceDto, 'content'>,
    @Req() req: Request,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envía el archivo en multipart/form-data con el campo "file"');
    }

    const safeName = file.originalname.replace(/[/\\]/g, '');
    const hasAllowedExtension = ALLOWED_UPLOAD_EXTENSIONS.some((ext) => safeName.toLowerCase().endsWith(ext));
    if (!hasAllowedExtension || safeName !== file.originalname) {
      throw new BadRequestException(
        `Por ahora solo se aceptan ${ALLOWED_UPLOAD_EXTENSIONS.join(', ')} con nombre de archivo simple. PDF/DOCX/XLSX llegan en una siguiente iteración.`,
      );
    }

    const allowedMimeTypes = [
      'text/plain',
      'text/markdown',
      'text/csv',
      'application/csv',
      'application/vnd.ms-excel', // algunos navegadores reportan el CSV así
      'application/octet-stream',
      '',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException(`Tipo MIME no permitido para esta carga: ${file.mimetype}`);
    }

    return this.knowledgeSourcesService.createFromUpload(dto, file, jwtUser(req).sub);
  }

  @Get()
  @RequireKnowledgeAction('view_source')
  findAll(@Req() req: Request) {
    const role = resolveKnowledgeRole(jwtUser(req));
    const ownerOnly = role === KnowledgeRole.KNOWLEDGE_UPLOADER ? jwtUser(req).sub : undefined;
    return this.knowledgeSourcesService.findAll(ownerOnly);
  }

  @Get(':id')
  @RequireKnowledgeAction('view_source')
  findOne(@Param('id') id: string, @Req() req: Request) {
    const role = resolveKnowledgeRole(jwtUser(req));
    const actorId = role === KnowledgeRole.KNOWLEDGE_UPLOADER ? jwtUser(req).sub : undefined;
    return this.knowledgeSourcesService.findOne(id, actorId);
  }

  @Post(':id/versions')
  @RequireKnowledgeAction('create_source')
  createNewVersion(@Param('id') id: string, @Body() dto: CreateKnowledgeVersionDto, @Req() req: Request) {
    const role = resolveKnowledgeRole(jwtUser(req));
    const actorId = role === KnowledgeRole.KNOWLEDGE_UPLOADER ? jwtUser(req).sub : undefined;
    return this.knowledgeSourcesService.createNewVersion(id, dto.content, jwtUser(req).sub, actorId);
  }

  @Get(':id/versions/compare')
  @RequireKnowledgeAction('view_source')
  compareVersions(@Param('id') id: string, @Query('from') from: string, @Query('to') to: string) {
    if (!from || !to) {
      throw new BadRequestException('Debes pasar los query params "from" y "to" con números de versión');
    }
    return this.knowledgeSourcesService.compareVersions(id, Number(from), Number(to));
  }

  @Patch(':id')
  @RequireKnowledgeAction('edit_metadata')
  update(@Param('id') id: string, @Body() dto: UpdateKnowledgeSourceDto, @Req() req: Request) {
    const role = resolveKnowledgeRole(jwtUser(req));
    const actorId = role === KnowledgeRole.KNOWLEDGE_UPLOADER ? jwtUser(req).sub : undefined;
    return this.knowledgeSourcesService.update(id, dto, jwtUser(req).sub, actorId);
  }

  @Post(':id/reprocess')
  @RequireKnowledgeAction('edit_metadata')
  reprocess(@Param('id') id: string) {
    return this.knowledgeSourcesService.reprocess(id);
  }

  @Post(':id/generate-embeddings')
  @RequireKnowledgeAction('edit_metadata')
  retryEmbeddings(@Param('id') id: string) {
    return this.knowledgeSourcesService.retryEmbeddings(id);
  }

  @Post(':id/review')
  @RequireKnowledgeAction('approve')
  review(@Param('id') id: string, @Body() dto: CreateKnowledgeReviewDto, @Req() req: Request) {
    return this.knowledgeReviewService.review(id, dto, jwtUser(req).sub);
  }

  @Post(':id/publish')
  @RequireKnowledgeAction('publish')
  publish(@Param('id') id: string, @Req() req: Request) {
    return this.knowledgePublishingService.publish(id, jwtUser(req).sub);
  }

  @Post(':id/archive')
  @RequireKnowledgeAction('archive')
  archive(@Param('id') id: string, @Body() dto: ArchiveKnowledgeSourceDto, @Req() req: Request) {
    return this.knowledgePublishingService.archive(id, dto, jwtUser(req).sub);
  }

  // Eliminar es irreversible (a diferencia de archivar): siempre exige
  // SUPER_ADMIN/TENANT_ADMIN, sin importar el flag de "supervisor puede archivar".
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Req() req: Request): Promise<void> {
    const role = resolveKnowledgeRole(jwtUser(req));
    if (!role || !FULL_ACCESS_ROLES.includes(role)) {
      throw new ForbiddenException('Solo un administrador puede eliminar una fuente de forma permanente');
    }
    return this.knowledgeSourcesService.remove(id, jwtUser(req).sub);
  }
}
