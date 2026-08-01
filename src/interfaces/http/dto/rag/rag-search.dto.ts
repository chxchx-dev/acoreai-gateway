import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RagSearchDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;
}
