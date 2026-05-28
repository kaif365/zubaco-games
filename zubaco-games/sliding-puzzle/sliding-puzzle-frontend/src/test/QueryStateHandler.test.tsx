import { render, screen } from '@testing-library/react';

import { QueryStateHandler } from '../components/shared/QueryStateHandler';

describe('QueryStateHandler', () => {
  it('renders content when not loading or error', () => {
    render(
      <QueryStateHandler isLoading={false} isError={false} isEmpty={false}>
        <div>Data Content</div>
      </QueryStateHandler>,
    );
    expect(screen.getByText('Data Content')).toBeInTheDocument();
  });

  it('renders loading state', () => {
    const { getByRole } = render(
      <QueryStateHandler isLoading={true} isError={false} isEmpty={true}>
        <div>Content</div>
      </QueryStateHandler>,
    );
    expect(getByRole('status')).toBeInTheDocument();
  });

  it('renders error state', () => {
    render(
      <QueryStateHandler isLoading={false} isError={true} error={new Error('Failed')}>
        <div>Content</div>
      </QueryStateHandler>,
    );
    expect(screen.getByText(/Failed/i)).toBeInTheDocument();
  });

  it('renders empty state', () => {
    render(
      <QueryStateHandler
        isLoading={false}
        isError={false}
        isEmpty={true}
        emptyFallback={<div>Empty</div>}
      >
        <div>Content</div>
      </QueryStateHandler>,
    );
    expect(screen.getByText('Empty')).toBeInTheDocument();
  });
});
