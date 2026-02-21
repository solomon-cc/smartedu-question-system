import { render, screen } from '@testing-library/react';
import Loading from './Loading';
import { describe, it, expect } from 'vitest';

describe('Loading Component', () => {
  it('renders loading text correctly', () => {
    render(<Loading />);
    const loadingText = screen.getByText(/Loading Data.../i);
    expect(loadingText).toBeInTheDocument();
  });

  it('renders the spinner icon', () => {
    const { container } = render(<Loading />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('animate-spin');
  });
});
