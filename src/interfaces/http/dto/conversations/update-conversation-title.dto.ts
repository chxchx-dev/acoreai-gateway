import { IsString, MaxLength } from 'class-validator';

export class UpdateConversationTitleDto {
  @IsString()
  @MaxLength(120)
  title!: string;
}
