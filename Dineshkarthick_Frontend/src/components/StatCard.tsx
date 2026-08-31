import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import type { StatCardData } from '../types';
import { palette } from '../theme';

const kindColor: Record<StatCardData['kind'], string> = {
  default: palette.registry,
  success: palette.verified,
  warning: palette.pending,
  error: palette.tampered,
};

export default function StatCard({ data, onClick }: { data: StatCardData; onClick?: () => void }) {
  return (
    <Paper
      onClick={onClick}
      elevation={0}
      sx={{
        p: 2.5,
        border: '1px solid #E2DFD1',
        borderRadius: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'box-shadow 0.15s, transform 0.15s',
        '&:hover': onClick ? { boxShadow: '0 4px 16px rgba(15,27,45,0.08)', transform: 'translateY(-1px)' } : {},
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kindColor[data.kind] }} />
        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>
          {data.label}
        </Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A2333' }}>
        {data.value}
      </Typography>
      {data.trend && (
        <Typography variant="caption" color="text.secondary">
          {data.trend}
        </Typography>
      )}
    </Paper>
  );
}
