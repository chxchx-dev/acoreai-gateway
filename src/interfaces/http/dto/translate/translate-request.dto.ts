import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class TranslateRequestDto {
  @IsString()
  @IsNotEmpty({ message: 'El texto no puede estar vacío' })
  @MaxLength(3000, { message: 'El texto no puede superar los 3000 caracteres' })
  text!: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Debes indicar al menos un idioma' })
  @ArrayMaxSize(3, { message: 'Máximo 3 idiomas por solicitud' })
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  languages!: string[];

  @IsOptional()
  @IsString()
  @MaxLength(100)
  model?: string;
}
