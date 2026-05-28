import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsString, IsNotEmpty } from 'class-validator';

export class DeleteConfigsDto {
    @ApiProperty({ type: [String], description: 'Array of stage IDs to delete' })
    @IsArray()
    @IsString({ each: true })
    @IsNotEmpty({ each: true })
    stageIds: string[];
}
