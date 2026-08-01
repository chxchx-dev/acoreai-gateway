import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class TtsRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto para TTS no puede estar vacío' })
  @MaxLength(4000)
  text!: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  voice?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  speed?: number;
}
