import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlineOutlined';
import RefreshIcon from '@mui/icons-material/Refresh';
import { palette } from '../theme';

export default function ErrorState({
  message = 'Something went wrong loading this data.',
  onRetry,
}: {
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.2,
        py: 6,
        px: 3,
        textAlign: 'center',
        border: '1px solid #E2DFD1',
        borderRadius: 2,
        bgcolor: '#FBF4F2',
      }}
    >
      <ErrorOutlineIcon sx={{ color: palette.tampered, fontSize: 32 }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{message}</Typography>
      <Typography variant="caption" color="text.secondary">
        Check your connection and try again.
      </Typography>
      {onRetry && (
        <Button size="small" startIcon={<RefreshIcon fontSize="small" />} onClick={onRetry} sx={{ mt: 1, color: palette.registry }}>
          Retry
        </Button>
      )}
    </Box>
  );
}
