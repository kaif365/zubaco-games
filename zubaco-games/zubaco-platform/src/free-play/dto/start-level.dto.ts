import { IsEnum, IsInt, Min, Max } from 'class-validator';
import { GameType } from '.prisma/client';

export class StartLevelDto {
  @IsEnum(GameType)
  game_type: GameType;

  @IsInt()
  @Min(1)
  @Max(999)
  level: number;
}
