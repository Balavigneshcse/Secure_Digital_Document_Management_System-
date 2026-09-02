import { Component, type ErrorInfo, type ReactNode } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import { palette } from '../theme';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

export default class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // In production this is where a real error-reporting call would go.
    console.error('SentinelDMS render error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
            bgcolor: palette.paper,
            px: 3,
            textAlign: 'center',
          }}
        >
          <ErrorOutlineIcon sx={{ color: palette.tampered, fontSize: 40 }} />
          <Typography variant="h6">Something went wrong</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 400 }}>
            This screen ran into an unexpected error. Reloading usually fixes it — if it keeps happening, let the team know what you were doing.
          </Typography>
          <Button
            variant="contained"
            onClick={() => window.location.reload()}
            sx={{ bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}
          >
            Reload
          </Button>
        </Box>
      );
    }
    return this.props.children;
  }
}
