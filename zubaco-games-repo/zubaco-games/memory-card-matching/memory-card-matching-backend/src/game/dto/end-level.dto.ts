import { ApiProperty } from "@nestjs/swagger";

export class EndLevelDto {
  @ApiProperty({ example: "sess-abc123" })
  sessionId!: string;

  @ApiProperty({ example: 0 })
  levelIndex!: number;
}
