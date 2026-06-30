import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { GameType } from '.prisma/client';

export class StartLevelDto {
  @IsEnum(GameType)
  game_type: GameType;

  @IsInt()
  @Min(1)
  @Max(999)
  level: number;

  @IsOptional()
  @IsString()
  client_seed?: string;

  @IsOptional()
  device_components?: any;
}
