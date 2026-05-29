import { TutorialRepository } from '@/features/sequence-recall/repositories/TutorialRepository';

describe('TutorialRepository', () => {
  it('returns tutorial steps for overlay flow', async () => {
    const repository = new TutorialRepository();
    const steps = await repository.getTutorialSteps();
    expect(steps.length).toBeGreaterThan(1);
    expect(steps[0].title.length).toBeGreaterThan(1);
  });
});
