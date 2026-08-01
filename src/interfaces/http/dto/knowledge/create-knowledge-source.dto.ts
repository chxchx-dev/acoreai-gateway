import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateKnowledgeSourceDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(['upload', 'text', 'url'])
  sourceType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  priority?: number;

  @IsOptional()
  @IsISO8601()
  validFrom?: string;

  @IsOptional()
  @IsISO8601()
  validUntil?: string;

  // Requerido cuando sourceType es "text" (FAQ/artículo manual). Para "upload"
  // el contenido viene del archivo en el endpoint multipart.
  @IsOptional()
  @IsString()
  content?: string;

  // Si ya existe una fuente con el mismo texto (mismo checksum) y no está
  // archivada/rechazada, por defecto se rechaza la carga. true fuerza una nueva versión igual.
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  allowDuplicate?: boolean;

  // ── Metadata de procedencia (opcional) ──────────────────────────────────
  // Cuando el "content" viene de convertir un PDF/DOCX/URL a Markdown (ver
  // /knowledge/sources/convert/*) y el usuario ya lo revisó, estos campos
  // preservan de dónde salió el texto aunque se guarde como sourceType "text".
  @IsOptional()
  @IsString()
  @MaxLength(300)
  originalFilename?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  mimeType?: string;

  @IsOptional()
  @IsUrl({ require_protocol: true })
  sourceUrl?: string;
}
