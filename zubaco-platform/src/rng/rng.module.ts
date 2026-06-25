import { Module } from '@nestjs/common';
import { DeterministicRngService } from './deterministic-rng.service';
import { PuzzleService } from './puzzle.service';

@Module({
  providers: [DeterministicRngService, PuzzleService],
  exports: [DeterministicRngService, PuzzleService],
})
export class RngModule {}
