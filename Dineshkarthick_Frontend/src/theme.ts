import { createTheme } from '@mui/material/styles';

// SentinelDMS design system.
// Grounded in the subject: a chain-of-custody evidence & case-file system for
// police, forensic experts, and the judiciary. The signature motif is an
// official "seal" — reserved for verification/trust moments only (login hero,
// the Verified badge, the blockchain integrity card). Everything else stays
// disciplined: a working registry, not a marketing page.
export const palette = {
  ink: '#10192B',       // official navy-black — sidebar, hero panel, dark surfaces
  paper: '#F2F1E8',     // ledger/bond-paper background
  registry: '#24365C',  // primary action / links / active nav — judicial indigo
  registryDark: '#182642',
  seal: '#9C7A3E',       // signature accent — brass/bronze, spent only on the verification motif
  sealLight: '#C9A968',  // lighter brass for use on dark (ink) surfaces
  verified: '#2F6E52',
  tampered: '#A23B2E',
  pending: '#B9862E',
  unsigned: '#7C8494',
  // legacy aliases so existing references to palette.seal-as-primary-action still read correctly
  get sealDark() {
    return this.registryDark;
  },
};

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: palette.registry, dark: palette.registryDark },
    background: { default: palette.paper, paper: '#FFFFFF' },
    text: { primary: '#1B2333', secondary: '#5D5A4E' },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    h1: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h2: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h3: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h4: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h5: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    h6: { fontFamily: '"Fraunces", Georgia, serif', fontWeight: 600 },
    subtitle1: { fontWeight: 700 },
    button: { textTransform: 'none', fontWeight: 600 },
  },
  shape: { borderRadius: 8 },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600, fontSize: '0.72rem' },
      },
    },
  },
});

export default theme;
