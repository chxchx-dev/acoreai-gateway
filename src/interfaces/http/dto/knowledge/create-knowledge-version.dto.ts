import { IsNotEmpty, IsString } from 'class-validator';

export class CreateKnowledgeVersionDto {
  @IsString()
  @IsNotEmpty()
  content!: string;
}
