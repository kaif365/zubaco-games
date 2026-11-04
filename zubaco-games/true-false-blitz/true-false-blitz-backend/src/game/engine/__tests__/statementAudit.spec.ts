import { generateStatements } from '../statementBank';

describe('True / False Blitz Statement Balance & Distribution Audit', () => {
  it('generates statements with balanced True and False distribution', () => {
    const statements = generateStatements(42, 20);
    expect(statements.length).toBe(20);

    const trueCount = statements.filter((s) => s.isTrue).length;
    const falseCount = statements.filter((s) => !s.isTrue).length;

    // Both true and false statements must be present in the generated challenge set
    expect(trueCount).toBeGreaterThan(0);
    expect(falseCount).toBeGreaterThan(0);

    // Verify all statements have valid text and unique IDs
    const ids = statements.map((s) => s.id);
    expect(new Set(ids).size).toBe(20);
    for (const s of statements) {
      expect(typeof s.text).toBe('string');
      expect(s.text.length).toBeGreaterThan(5);
    }
  });

  it('guarantees deterministic sequence from same seed', () => {
    const setA = generateStatements(12345, 10);
    const setB = generateStatements(12345, 10);
    expect(setA).toEqual(setB);
  });
});
