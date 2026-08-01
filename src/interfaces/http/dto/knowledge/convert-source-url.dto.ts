import { IsNotEmpty, IsString, IsUrl } from 'class-validator';

export class ConvertSourceUrlDto {
  @IsString()
  @IsNotEmpty()
  @IsUrl({ require_protocol: true })
  url!: string;
}
