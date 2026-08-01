import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TrialChatRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'La pregunta no puede estar vacía' })
  @MaxLength(500, { message: 'La pregunta no puede superar los 500 caracteres' })
  question!: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  conversationId?: string;
}
