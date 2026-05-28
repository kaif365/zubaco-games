import { render, screen, fireEvent } from '@testing-library/react';

import { Input } from '../components/ui/input';

describe('Input component', () => {
  it('renders and handles changes', () => {
    const onChange = jest.fn();
    render(<Input placeholder="Enter name" onChange={onChange} />);

    const input = screen.getByPlaceholderText('Enter name');
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'John' } });
    expect(onChange).toHaveBeenCalled();
  });
});
