import { IsString, IsInt, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { GameType } from '.prisma/client';
import { MIN_SESSION_DURATION_MS, MAX_SESSION_DURATION_MS, MAX_SCORE } from '../constants';

export class SubmitTournamentResultDto {
  @IsString()
  session_id: string;

  @IsInt({ message: 'Score must be a whole number' })
  @Min(0, { message: 'Score cannot be negative' })
  @Max(MAX_SCORE, { message: 'Score exceeds maximum' })
  score: number;

  @IsInt({ message: 'Duration must be a whole number of milliseconds' })
  @Min(MIN_SESSION_DURATION_MS, { message: 'Duration too short' })
  @Max(MAX_SESSION_DURATION_MS, { message: 'Duration exceeds maximum (10 minutes)' })
  duration_ms: number;
}

export class StartGameDto {
  @IsEnum(GameType, { message: 'Unknown game type' })
  game_type: GameType;

  @IsOptional()
  config?: any;

  @IsOptional()
  @IsString()
  client_seed?: string;

  @IsOptional()
  device_components?: any;
}

export class SubmitGameResultDto {
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

  @IsOptional()
  @IsString()
  moves_hash?: string;

  @IsOptional()
  input_signature?: any;
}

export class StartTournamentGameDto {
  @IsString()
  stage_game_id: string;

  @IsString()
  stage_entry_id: string;
}
