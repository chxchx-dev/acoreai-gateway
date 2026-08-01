import { IsIn, IsNotEmpty, IsString, IsUrl } from 'class-validator';

// Cron de 5 campos validado en el service contra la librería `cron`;
// aquí solo evitamos strings vacíos/absurdos.
export class CreateKnowledgeWatcherDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsString()
  @IsNotEmpty()
  sourceId!: string;

  @IsUrl({ require_protocol: true })
  targetUrl!: string;

  @IsString()
  @IsNotEmpty()
  scheduleCron!: string;
}

export class SetWatcherStatusDto {
  @IsIn(['active', 'paused'])
  status!: 'active' | 'paused';
}
