import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ChatOptionsDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  num_ctx?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  num_predict?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  top_p?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  top_k?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  repeat_penalty?: number;

  @IsOptional()
  @IsInt()
  seed?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  num_batch?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  num_keep?: number;
}

export class ChatRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'La pregunta no puede estar vacía' })
  @MaxLength(1000, { message: 'La pregunta no puede superar los 1000 caracteres' })
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  userId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  source?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  area?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  language?: string;

  // Forzar true/false anula la clasificación automática (override manual/debug).
  // Si se omite, ChatService.resolveUseRag() decide con IntentClassifierService
  // según la pregunta, en vez de depender de que el cliente lo adivine.
  @IsOptional()
  @IsBoolean()
  useRag?: boolean;

  @IsOptional()
  @IsBoolean()
  useHistory?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(30)
  historyLimit?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  system?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatOptionsDto)
  options?: ChatOptionsDto;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  keepAlive?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  mode?: 'chat' | 'voice' | 'practice';

  @IsOptional()
  @IsString()
  @MaxLength(30)
  practiceLevel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  practiceLanguage?: string;
}
