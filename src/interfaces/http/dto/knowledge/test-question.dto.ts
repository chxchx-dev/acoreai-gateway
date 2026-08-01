import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class TestQuestionDto {
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  question!: string;

  @IsOptional()
  @IsString()
  model?: string;
}

export class TestQuestionFeedbackDto {
  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsString()
  @IsNotEmpty()
  question!: string;

  @IsString()
  @IsIn(['correct', 'insufficient'])
  feedback!: 'correct' | 'insufficient';
}
