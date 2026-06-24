import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';

export class SubmitTournamentResultDto {
  @IsString()
  session_id: string;

  @IsNumber()
  @Min(0, { message: 'Score cannot be negative' })
  @Max(100000, { message: 'Score exceeds maximum' })
  score: number;

  @IsNumber()
  @Min(1000, { message: 'Duration too short' })
  @Max(600000, { message: 'Duration exceeds maximum (10 minutes)' })
  duration_ms: number;
}

export class StartGameDto {
  @IsString()
  game_type: string;

  @IsOptional()
  config?: any;
}

export class SubmitGameResultDto {
  @IsNumber()
  @Min(0)
  @Max(100000)
  score: number;

  @IsNumber()
  @Min(1000)
  @Max(600000)
  duration_ms: number;

  @IsOptional()
  metadata?: any;
}

export class StartTournamentGameDto {
  @IsString()
  stage_game_id: string;

  @IsString()
  stage_entry_id: string;
}
