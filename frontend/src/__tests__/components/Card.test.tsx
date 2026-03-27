import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Card from '@/components/ui/Card';

describe('Card', () => {
  it('renders children', () => {
    render(<Card>Content</Card>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(<Card title="My Card">Content</Card>);
    expect(screen.getByText('My Card')).toBeInTheDocument();
  });

  it('does not render title heading when not provided', () => {
    render(<Card>Content</Card>);
    expect(screen.queryByRole('heading')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<Card className="custom-class">Content</Card>);
    expect(screen.getByText('Content').parentElement).toHaveClass('custom-class');
  });
});
