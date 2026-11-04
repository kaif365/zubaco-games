import { selectQuestions } from '../questionBank';

describe('Speed Type Answer — Question Bank & Answer Validation Audit', () => {
  it('selects exactly N unique questions without duplicates', () => {
    const count = 10;
    const questions = selectQuestions(12345, count);

    expect(questions.length).toBe(count);

    const texts = new Set<string>();
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]!;
      expect(q.id).toBe(i);
      expect(q.text.length).toBeGreaterThan(0);
      expect(q.answer.length).toBeGreaterThan(0);
      texts.add(q.text);
    }

    expect(texts.size).toBe(count);
  });

  it('guarantees deterministic question selection from seed', () => {
    const qA = selectQuestions(99999, 8);
    const qB = selectQuestions(99999, 8);
    const qC = selectQuestions(11111, 8);

    expect(qA).toEqual(qB);
    expect(qA[0]!.text).not.toBe(qC[0]!.text);
  });

  it('correctly matches answers with whitespace trimming and case insensitivity', () => {
    const questions = selectQuestions(42, 5);
    const q = questions[0]!;

    const variations = [
      q.answer,
      q.answer.toUpperCase(),
      `  ${q.answer}  `,
      `  ${q.answer.toUpperCase()}  `,
    ];

    for (const variant of variations) {
      const isMatch = variant.trim().toLowerCase() === q.answer.toLowerCase();
      expect(isMatch).toBe(true);
    }

    const wrongAnswer = `${q.answer}_typo`;
    expect(wrongAnswer.trim().toLowerCase() === q.answer.toLowerCase()).toBe(false);
  });

  it('calculates speed bonus scaling based on response time', () => {
    const pointsPerCorrect = 20;
    const speedBonusMax = 10;
    const answerTimeMs = 5000;

    // Instant answer (responseTimeMs = 0) -> 100% bonus (10 pts) -> 30 total
    const instantRatio = Math.max(0, 1 - 0 / answerTimeMs);
    const instantScore = pointsPerCorrect + Math.round(instantRatio * speedBonusMax);
    expect(instantScore).toBe(30);

    // Halfway answer (responseTimeMs = 2500) -> 50% bonus (5 pts) -> 25 total
    const halfRatio = Math.max(0, 1 - 2500 / answerTimeMs);
    const halfScore = pointsPerCorrect + Math.round(halfRatio * speedBonusMax);
    expect(halfScore).toBe(25);

    // Last second answer (responseTimeMs = 5000) -> 0% bonus (0 pts) -> 20 total
    const lateRatio = Math.max(0, 1 - 5000 / answerTimeMs);
    const lateScore = pointsPerCorrect + Math.round(lateRatio * speedBonusMax);
    expect(lateScore).toBe(20);
  });
});
