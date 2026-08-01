import { BadRequestException, Body, Controller, Post, UseGuards, UseInterceptors, UploadedFile } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiKeyGuard } from '../guards/api-key.guard';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { KnowledgePermissionGuard } from '../guards/knowledge-permission.guard';
import { RequireKnowledgeAction } from '../decorators/knowledge-action.decorator';
import { ConvertSourceUrlDto } from '../dto/knowledge/convert-source-url.dto';
import { parseDocxToMarkdown, parsePdfToMarkdown, parseUrlToMarkdown } from 'src/modules/knowledge/ingestion/document-parsers';

interface MulterFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

// Convierte PDF/DOCX/URL a Markdown y lo DEVUELVE sin tocar la base de datos.
// El usuario lo revisa/edita en el front y recién ahí llama a
// POST /knowledge/sources (sourceType: "text") con el Markdown ya corregido —
// ese endpoint es el que de verdad arranca el pipeline (extracción → chunks →
// embeddings). Separar "convertir" de "guardar" es justo lo que pidió el flujo.
@UseGuards(ApiKeyGuard, JwtAuthGuard, KnowledgePermissionGuard)
@Controller('knowledge/sources/convert')
export class KnowledgeSourceConversionController {
  // Conversión de PDF/DOCX es más pesada que una carga de texto plano.
  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post('upload')
  @RequireKnowledgeAction('create_source')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB, suficiente para PDFs/DOCX típicos
    }),
  )
  async convertUpload(@UploadedFile() file: MulterFile) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Envía el archivo en multipart/form-data con el campo "file"');
    }

    const name = file.originalname.toLowerCase();
    const parsed = name.endsWith('.pdf')
      ? await parsePdfToMarkdown(file.buffer)
      : name.endsWith('.docx')
        ? await parseDocxToMarkdown(file.buffer)
        : null;

    if (!parsed) {
      throw new BadRequestException('Solo se aceptan archivos .pdf o .docx en esta conversión');
    }

    return {
      markdown: parsed.markdown,
      suggestedTitle: parsed.suggestedTitle,
      warnings: parsed.warnings,
      originalFilename: file.originalname,
      mimeType: file.mimetype,
    };
  }

  @Throttle({ default: { limit: 10, ttl: 3600000 } })
  @Post('url')
  @RequireKnowledgeAction('create_source')
  async convertUrl(@Body() dto: ConvertSourceUrlDto) {
    const parsed = await parseUrlToMarkdown(dto.url);

    return {
      markdown: parsed.markdown,
      suggestedTitle: parsed.suggestedTitle,
      warnings: parsed.warnings,
      sourceUrl: dto.url,
    };
  }
}
