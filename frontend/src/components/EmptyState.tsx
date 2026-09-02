import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';

export default function EmptyState({
  title = 'Nothing here yet',
  description,
  icon: Icon = InboxOutlinedIcon,
}: {
  title?: string;
  description?: string;
  icon?: SvgIconComponent;
}) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1, py: 6, px: 3, textAlign: 'center' }}>
      <Icon sx={{ color: '#B9B29C', fontSize: 32 }} />
      <Typography variant="body2" sx={{ fontWeight: 600 }}>{title}</Typography>
      {description && (
        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 320 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}
