import { IsString, IsInt, Min, Max, IsOptional } from 'class-validator';
import { MIN_SESSION_DURATION_MS, MAX_SESSION_DURATION_MS, MAX_SCORE } from '../../game-session/constants';

export class SubmitResultDto {
  @IsString()
  session_id: string;

  @IsInt()
  @Min(0)
  @Max(MAX_SCORE)
  score: number;

  @IsInt()
  @Min(MIN_SESSION_DURATION_MS)
  @Max(MAX_SESSION_DURATION_MS)
  duration_ms: number;

  @IsOptional()
  metadata?: any;
}
