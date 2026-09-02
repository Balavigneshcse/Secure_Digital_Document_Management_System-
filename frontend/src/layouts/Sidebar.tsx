import { NavLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { navForRole } from './navConfig';
import { useAuth } from '../hooks/useAuth';
import { palette } from '../theme';
import Seal from '../components/Seal';

export default function Sidebar({
  collapsed,
  onToggle,
  onNavigate,
  hideCollapseToggle = false,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
  hideCollapseToggle?: boolean;
}) {
  const { user } = useAuth();
  const items = user ? navForRole(user.role) : [];

  return (
    <Box
      component="aside"
      sx={{
        width: collapsed ? 72 : 240,
        transition: 'width 0.18s ease',
        bgcolor: palette.ink,
        color: '#F2EFE3',
        display: 'flex',
        flexDirection: 'column',
        flexShrink: 0,
        height: '100vh',
        position: 'sticky',
        top: 0,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, px: collapsed ? 0 : 2, py: 2.5, justifyContent: collapsed ? 'center' : 'flex-start' }}>
        <Seal size={22} color={palette.sealLight} />
        {!collapsed && (
          <Typography className="font-display" sx={{ fontWeight: 600, letterSpacing: 0.2, fontSize: '1.1rem' }}>
            Sentinel<span style={{ color: palette.sealLight }}>DMS</span>
          </Typography>
        )}
      </Box>

      <Box sx={{ flex: 1, px: collapsed ? 1 : 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        {items.map((item) => (
          <Tooltip key={item.path} title={collapsed ? item.label : ''} placement="right">
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onNavigate}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: collapsed ? '10px' : '10px 12px',
                justifyContent: collapsed ? 'center' : 'flex-start',
                borderRadius: 8,
                textDecoration: 'none',
                color: isActive ? '#FFFFFF' : '#B9B29C',
                backgroundColor: isActive ? 'rgba(201,169,104,0.16)' : 'transparent',
                fontWeight: isActive ? 600 : 500,
                fontSize: '0.875rem',
              })}
            >
              <item.icon fontSize="small" />
              {!collapsed && <span>{item.label}</span>}
            </NavLink>
          </Tooltip>
        ))}
      </Box>

      {!hideCollapseToggle && (
        <Box sx={{ display: 'flex', justifyContent: collapsed ? 'center' : 'flex-end', p: 1.5 }}>
          <IconButton size="small" onClick={onToggle} sx={{ color: '#B9B29C' }}>
            {collapsed ? <ChevronRightIcon fontSize="small" /> : <ChevronLeftIcon fontSize="small" />}
          </IconButton>
        </Box>
      )}
    </Box>
  );
}
