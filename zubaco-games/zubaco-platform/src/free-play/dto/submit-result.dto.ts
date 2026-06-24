import { IsString, IsInt, Min, IsOptional } from 'class-validator';

export class SubmitResultDto {
  @IsString()
  session_id: string;

  @IsInt()
  @Min(0)
  score: number;

  @IsInt()
  @Min(0)
  duration_ms: number;

  @IsOptional()
  metadata?: any;
}
