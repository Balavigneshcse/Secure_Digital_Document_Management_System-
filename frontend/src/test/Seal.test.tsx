import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import Seal from '../components/Seal';

describe('Seal', () => {
  it('renders an svg element', () => {
    const { container } = render(<Seal />);
    expect(container.querySelector('svg')).toBeTruthy();
  });

  it('respects a custom size', () => {
    const { container } = render(<Seal size={40} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '40');
    expect(svg).toHaveAttribute('height', '40');
  });
});
