import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThemeProvider } from '@mui/material/styles';
import theme from '../theme';
import StatusBadge from '../components/StatusBadge';

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

describe('StatusBadge', () => {
  it('renders the Verified label', () => {
    renderWithTheme(<StatusBadge status="VERIFIED" />);
    expect(screen.getByText('Verified')).toBeInTheDocument();
  });

  it('renders the Tampered label', () => {
    renderWithTheme(<StatusBadge status="TAMPERED" />);
    expect(screen.getByText('Tampered')).toBeInTheDocument();
  });

  it('renders the Pending Signature label', () => {
    renderWithTheme(<StatusBadge status="PENDING_SIGNATURE" />);
    expect(screen.getByText('Pending Signature')).toBeInTheDocument();
  });

  it('renders the Unsigned label', () => {
    renderWithTheme(<StatusBadge status="UNSIGNED" />);
    expect(screen.getByText('Unsigned')).toBeInTheDocument();
  });
});
