import { useState } from 'react';
import Box from '@mui/material/Box';
import InputBase from '@mui/material/InputBase';
import Avatar from '@mui/material/Avatar';
import Typography from '@mui/material/Typography';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import SearchIcon from '@mui/icons-material/Search';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import { useNavigate } from 'react-router-dom';
import NotificationsPanel from '../components/NotificationsPanel';
import { useAuth } from '../hooks/useAuth';
import { palette } from '../theme';

const roleLabel: Record<string, string> = {
  ADMIN: 'Administrator',
  IO: 'Investigating Officer',
  JUDGE: 'Judge',
  FORENSIC: 'Forensic Expert',
};

export default function TopBar({ onMenuClick }: { onMenuClick?: () => void }) {
  const { user, logout } = useAuth();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const navigate = useNavigate();

  return (
    <Box
      component="header"
      sx={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: { xs: 1.5, sm: 3 },
        gap: 1,
        borderBottom: '1px solid #E2DFD1',
        bgcolor: '#FFFFFF',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 0, flex: 1 }}>
        {onMenuClick && (
          <IconButton size="small" onClick={onMenuClick} sx={{ flexShrink: 0 }}>
            <MenuIcon fontSize="small" />
          </IconButton>
        )}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            bgcolor: '#EBE9DE',
            borderRadius: 2,
            px: 1.5,
            py: 0.7,
            width: { xs: '100%', sm: 360 },
            maxWidth: { xs: '100%', sm: '40vw' },
            minWidth: 0,
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: '#8B8677', flexShrink: 0 }} />
          <InputBase
            placeholder="Search cases, documents, people…"
            onKeyDown={(e) => {
              if (e.key === 'Enter') navigate('/documents');
            }}
            sx={{ fontSize: '0.875rem', width: '100%', minWidth: 0 }}
          />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 }, flexShrink: 0 }}>
        <NotificationsPanel />
        <Box
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', pl: { xs: 0, sm: 1 } }}
        >
          <Avatar sx={{ width: 34, height: 34, bgcolor: palette.registry, fontSize: '0.8rem', fontWeight: 700 }}>
            {user?.avatarInitials}
          </Avatar>
          <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
            <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
              {user?.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {user ? roleLabel[user.role] : ''}
            </Typography>
          </Box>
        </Box>
        <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
          <MenuItem disabled sx={{ opacity: '1 !important' }}>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {user?.email}
              </Typography>
            </Box>
          </MenuItem>
          <Divider />
          <MenuItem onClick={logout}>
            <LogoutOutlinedIcon fontSize="small" sx={{ mr: 1 }} /> Log out
          </MenuItem>
        </Menu>
      </Box>
    </Box>
  );
}
