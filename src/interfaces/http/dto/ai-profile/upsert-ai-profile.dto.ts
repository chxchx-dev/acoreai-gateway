import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  Length,
} from 'class-validator';

const PREFERRED_MODES = ['explore', 'languages', 'both'] as const;
const ENGLISH_LEVELS = ['beginner', 'intermediate', 'advanced', 'unknown'] as const;
const CORRECTION_STYLES = ['soft', 'balanced', 'strict'] as const;
const PRACTICE_STYLES = [
  'free_conversation',
  'guided_situations',
  'qa',
  'roleplay',
  'interview',
  'academic_presentation',
] as const;

export class UpsertAiProfileDto {
  @IsIn(PREFERRED_MODES)
  preferredMode!: string;

  @IsString()
  @Length(1, 300)
  mainGoal!: string;

  @IsIn(ENGLISH_LEVELS)
  englishLevel!: string;

  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  interestTopics!: string[];

  @IsIn(CORRECTION_STYLES)
  correctionStyle!: string;

  @IsIn(PRACTICE_STYLES)
  practiceStyle!: string;
}
