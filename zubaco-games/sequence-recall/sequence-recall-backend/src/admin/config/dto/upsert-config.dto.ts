import { WRONG_MOVE_HANDLING } from '@common/constants';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsNotEmpty, IsNumber, IsString, Min, IsOptional } from 'class-validator';

export class UpsertConfigDto {
    @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
    @IsString()
    @IsNotEmpty()
    stageId: string;

    @ApiProperty({ example: 180 })
    @IsInt()
    @Min(1)
    timeLimit: number;

    @ApiProperty({ example: 4, description: 'Minimum sequence length to start actual game' })
    @IsInt()
    @Min(1)
    minSequence: number;

    @ApiProperty({ example: 15, description: 'Maximum sequence length to reach in actual game' })
    @IsInt()
    @Min(1)
    maxSequence: number;

    @ApiProperty({ example: 2, description: 'Minimum sequence length for demo game' })
    @IsInt()
    @Min(0)
    @IsOptional()
    demoMinSequence?: number = 0;

    @ApiProperty({ example: true, description: 'Set to false to disable demo rounds completely' })
    @IsBoolean()
    @IsOptional()
    enableDemo?: boolean = true;

    @ApiProperty({ example: 4, description: 'Maximum sequence length for demo game' })
    @IsInt()
    @Min(0)
    @IsOptional()
    demoMaxSequence?: number = 0;

    @ApiProperty({ example: 500, description: 'Delay between tile flashes in milliseconds' })
    @IsInt()
    @Min(0)
    flashDelay: number;

    @ApiProperty({ example: 0, description: 'Delay between levels in milliseconds' })
    @IsInt()
    @Min(0)
    @IsOptional()
    levelDelay?: number = 0;

    @ApiProperty({ example: 1.0 })
    @IsNumber()
    @Min(0)
    @IsOptional()
    bonusTimeRatio?: number = 1.0;

    @ApiProperty({ example: 4 })
    @IsInt()
    @Min(1)
    @IsOptional()
    cellCount?: number = 4;

    @ApiProperty({ example: 20 })
    @IsInt()
    @Min(0)
    scorePerClick: number;

    @ApiProperty({ example: 4, description: '1=GameEnd 2=PlayAgain 3=PrevSequence 4=NextSequence' })
    @IsInt()
    @Min(1)
    @IsOptional()
    wrongMoveHandling?: number = WRONG_MOVE_HANDLING.NEXT_SEQUENCE;
}
