import { useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Chip from '@mui/material/Chip';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import PersonAddAltOutlinedIcon from '@mui/icons-material/PersonAddAltOutlined';
import LockResetOutlinedIcon from '@mui/icons-material/LockResetOutlined';
import { mockUserList } from '../mocks/data';
import { palette } from '../theme';
import type { Role } from '../types';

export default function UserManagementPage() {
  const [users, setUsers] = useState(mockUserList);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [invite, setInvite] = useState({ name: '', email: '', role: 'IO' as Role });
  const [toast, setToast] = useState('');

  const handleInvite = () => {
    if (!invite.name || !invite.email) return;
    setUsers((u) => [...u, { id: `usr-${u.length + 1}`, name: invite.name, email: invite.email, role: invite.role, status: 'Invited' }]);
    setInvite({ name: '', email: '', role: 'IO' });
    setInviteOpen(false);
    setToast(`Invitation sent to ${invite.email}`);
  };

  const handleRoleChange = (id: string, role: Role) => {
    setUsers((u) => u.map((usr) => (usr.id === id ? { ...usr, role } : usr)));
  };

  const handleMfaReset = (name: string) => {
    setToast(`MFA reset triggered for ${name}`);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>Users & Roles</Typography>
          <Typography variant="body2" color="text.secondary">Manage access and permissions across the system.</Typography>
        </Box>
        <Button variant="contained" startIcon={<PersonAddAltOutlinedIcon />} onClick={() => setInviteOpen(true)} sx={{ bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}>
          Invite User
        </Button>
      </Box>

      <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ bgcolor: '#F6F5EE' }}>
                <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Select
                      size="small"
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value as Role)}
                      sx={{ minWidth: 130, fontSize: '0.85rem' }}
                    >
                      {(['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] as Role[]).map((r) => (
                        <MenuItem key={r} value={r}>{r}</MenuItem>
                      ))}
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.status} sx={{ bgcolor: u.status === 'Active' ? '#E8F5EE' : '#FBF2E3', color: u.status === 'Active' ? '#1E5E42' : '#7A5A1A', fontWeight: 600 }} />
                  </TableCell>
                  <TableCell>
                    <Button size="small" startIcon={<LockResetOutlinedIcon fontSize="small" />} onClick={() => handleMfaReset(u.name)}>
                      Reset MFA
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Dialog open={inviteOpen} onClose={() => setInviteOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>Invite User</DialogTitle>
        <DialogContent>
          <TextField label="Full name" fullWidth margin="normal" value={invite.name} onChange={(e) => setInvite({ ...invite, name: e.target.value })} />
          <TextField label="Email" fullWidth margin="normal" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
          <TextField select label="Role" fullWidth margin="normal" value={invite.role} onChange={(e) => setInvite({ ...invite, role: e.target.value as Role })}>
            {(['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] as Role[]).map((r) => (
              <MenuItem key={r} value={r}>{r}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleInvite} sx={{ bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}>Send invite</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={Boolean(toast)} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </Box>
  );
}
