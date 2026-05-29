import { ROUTES } from '../app/router/routes';

describe('ROUTES', () => {
  it('defines the correct home route', () => {
    expect(ROUTES.HOME).toBe('/');
  });
});
