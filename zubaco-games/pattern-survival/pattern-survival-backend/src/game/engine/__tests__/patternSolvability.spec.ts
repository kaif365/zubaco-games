function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function generateSequence(seed: number, round: number): number[] {
  const rng = mulberry32(seed + round * 7919);
  const sequence: number[] = [];
  for (let i = 0; i <= round; i++) {
    sequence.push(Math.floor(rng() * 9));
  }
  return sequence;
}

function verifySurvivalRounds(
  seed: number,
  roundInputs: number[][],
): { verifiedRounds: number } {
  let verifiedRounds = 0;
  for (let round = 0; round < roundInputs.length; round++) {
    const expectedSeq = generateSequence(seed, round);
    const playerInput = roundInputs[round]!;

    if (playerInput.length !== expectedSeq.length) break;

    let roundCorrect = true;
    for (let i = 0; i < expectedSeq.length; i++) {
      if (playerInput[i] !== expectedSeq[i]) {
        roundCorrect = false;
        break;
      }
    }

    if (!roundCorrect) break;
    verifiedRounds++;
  }
  return { verifiedRounds };
}

describe('Pattern Survival — Sequence Invariants & Survival Run Audit', () => {
  it('generates strictly length r+1 sequences with grid indices between 0 and 8', () => {
    const seed = 98765;
    for (let round = 0; round < 15; round++) {
      const seq = generateSequence(seed, round);
      expect(seq.length).toBe(round + 1);

      for (const cellIndex of seq) {
        expect(cellIndex).toBeGreaterThanOrEqual(0);
        expect(cellIndex).toBeLessThanOrEqual(8);
      }
    }
  });

  it('guarantees deterministic sequence reproduction across rounds', () => {
    const seed = 12345;
    const runA = [0, 1, 2, 3, 4].map((r) => generateSequence(seed, r));
    const runB = [0, 1, 2, 3, 4].map((r) => generateSequence(seed, r));

    expect(runA).toEqual(runB);
  });

  it('validates consecutive perfect rounds and tallies correct verified rounds', () => {
    const seed = 54321;
    const roundsToSimulate = 5;
    const perfectInputs = Array.from({ length: roundsToSimulate }, (_, r) =>
      generateSequence(seed, r),
    );

    const result = verifySurvivalRounds(seed, perfectInputs);
    expect(result.verifiedRounds).toBe(roundsToSimulate);
  });

  it('immediately stops survival progression on the first incorrect entry', () => {
    const seed = 54321;
    const inputs = [
      generateSequence(seed, 0), // correct (round 0)
      generateSequence(seed, 1), // correct (round 1)
      [99, 99, 99], // incorrect (round 2)
      generateSequence(seed, 3), // should never be reached
    ];

    const result = verifySurvivalRounds(seed, inputs);
    expect(result.verifiedRounds).toBe(2);
  });

  it('terminates immediately if input length does not match expected round length', () => {
    const seed = 54321;
    const inputs = [
      generateSequence(seed, 0), // correct (length 1)
      [1], // round 1 expects length 2, but received length 1
    ];

    const result = verifySurvivalRounds(seed, inputs);
    expect(result.verifiedRounds).toBe(1);
  });
});
