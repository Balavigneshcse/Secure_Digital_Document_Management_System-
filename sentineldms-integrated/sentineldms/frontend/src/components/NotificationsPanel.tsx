import { useState } from 'react';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import { formatDistanceToNow } from 'date-fns';
import { useNotifications, useMarkNotificationRead } from '../hooks/useNotifications';
import { palette } from '../theme';

const kindDot: Record<string, string> = {
  info: palette.registry,
  success: palette.verified,
  warning: palette.pending,
  error: palette.tampered,
};

export default function NotificationsPanel() {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const { data: notifications = [] } = useNotifications();
  const markRead = useMarkNotificationRead();
  const unread = notifications.filter((n) => !n.read).length;

  return (
    <>
      <IconButton onClick={(e) => setAnchor(e.currentTarget)}>
        <Badge badgeContent={unread} color="error">
          <NotificationsNoneOutlinedIcon />
        </Badge>
      </IconButton>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)} slotProps={{ paper: { sx: { width: 360, maxHeight: 420 } } }}>
        <Box sx={{ px: 2, py: 1.2 }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
        </Box>
        <Divider />
        {notifications.length === 0 && (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              You're all caught up.
            </Typography>
          </Box>
        )}
        {notifications.map((n) => (
          <MenuItem
            key={n.id}
            onClick={() => markRead.mutate(n.id)}
            sx={{ whiteSpace: 'normal', alignItems: 'flex-start', py: 1.2, opacity: n.read ? 0.55 : 1 }}
          >
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: kindDot[n.kind], mt: 0.7, mr: 1.5, flexShrink: 0 }} />
            <Box>
              <Typography variant="body2" sx={{ fontWeight: n.read ? 400 : 600 }}>
                {n.message}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formatDistanceToNow(new Date(n.timestamp), { addSuffix: true })}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
