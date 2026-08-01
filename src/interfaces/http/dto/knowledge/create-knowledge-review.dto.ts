import { IsIn, IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

const DECISIONS = ['approved', 'rejected', 'needs_changes'] as const;
export type KnowledgeReviewDecisionInput = (typeof DECISIONS)[number];

export class CreateKnowledgeReviewDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(DECISIONS)
  decision!: KnowledgeReviewDecisionInput;

  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsObject()
  checklist?: Record<string, boolean>;
}
