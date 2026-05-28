import { TimerBar } from '@/components/TimerBar';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

describe('TimerBar', () => {
  it('renders the formatted time', () => {
    render(<TimerBar timeRemaining={75} />);
    expect(screen.getByText('1:15')).toBeInTheDocument();
  });

  it('renders 0:00 when timeRemaining is 0', () => {
    render(<TimerBar timeRemaining={0} />);
    expect(screen.getByText('0:00')).toBeInTheDocument();
  });

  it('renders full time correctly', () => {
    render(<TimerBar timeRemaining={120} />);
    expect(screen.getByText('2:00')).toBeInTheDocument();
  });

  it('renders single-digit seconds with leading zero', () => {
    render(<TimerBar timeRemaining={65} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });
});
