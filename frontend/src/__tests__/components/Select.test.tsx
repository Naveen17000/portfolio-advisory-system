import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Select from '@/components/ui/Select';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
];

describe('Select', () => {
  it('renders with label and options', () => {
    render(<Select label="Choice" options={options} />);
    expect(screen.getByLabelText('Choice')).toBeInTheDocument();
    expect(screen.getByText('Option A')).toBeInTheDocument();
    expect(screen.getByText('Option B')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Select label="Choice" options={options} error="Required" />);
    expect(screen.getByRole('alert')).toHaveTextContent('Required');
  });

  it('handles selection', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Select label="Choice" options={options} onChange={onChange} />);
    await user.selectOptions(screen.getByLabelText('Choice'), 'a');
    expect(onChange).toHaveBeenCalled();
  });
});
