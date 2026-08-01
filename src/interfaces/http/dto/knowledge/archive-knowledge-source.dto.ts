import { IsOptional, IsString } from 'class-validator';

export class ArchiveKnowledgeSourceDto {
  @IsOptional()
  @IsString()
  reason?: string;
}
