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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import AddIcon from '@mui/icons-material/Add';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useCases, useCreateCase } from '../hooks/useCases';
import { TableSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { palette } from '../theme';
import type { CaseStatus } from '../types';

const statusColor: Record<CaseStatus, { bg: string; fg: string }> = {
  OPEN: { bg: '#EAF1FB', fg: '#1E3A5F' },
  UNDER_REVIEW: { bg: '#FBF2E3', fg: '#7A5A1A' },
  CLOSED: { bg: '#EEF0F3', fg: '#565E6D' },
};

export default function CasesPage() {
  const { data: cases = [], isLoading, isError, refetch } = useCases();
  const createCase = useCreateCase();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', assignedOfficer: '' });

  const handleCreate = async () => {
    if (!form.title || !form.assignedOfficer) return;
    await createCase.mutateAsync(form);
    setForm({ title: '', description: '', assignedOfficer: '' });
    setOpen(false);
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>Case Management</Typography>
          <Typography variant="body2" color="text.secondary">Track investigations and their linked documents.</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)} sx={{ bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}>
          New Case
        </Button>
      </Box>

      {isError ? (
        <ErrorState message="Couldn't load cases." onRetry={() => refetch()} />
      ) : (
        <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, overflow: 'hidden' }}>
          {isLoading ? (
            <TableSkeleton rows={7} cols={6} />
          ) : cases.length === 0 ? (
            <EmptyState title="No cases yet" description="Create your first case to start linking documents to it." />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F6F5EE' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Case ID</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Assigned officer</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Documents</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Updated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {cases.map((c) => (
                    <TableRow key={c.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/cases/${c.id}`)}>
                      <TableCell className="font-mono-data" sx={{ fontSize: '0.78rem' }}>{c.id}</TableCell>
                      <TableCell sx={{ fontWeight: 500 }}>{c.title}</TableCell>
                      <TableCell>{c.assignedOfficer}</TableCell>
                      <TableCell>{c.documentCount}</TableCell>
                      <TableCell>{format(new Date(c.updatedAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={c.status.replace('_', ' ')}
                          sx={{ bgcolor: statusColor[c.status].bg, color: statusColor[c.status].fg, fontWeight: 600 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 700 }}>New Case</DialogTitle>
        <DialogContent>
          <TextField label="Case title" fullWidth margin="normal" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <TextField label="Description" fullWidth multiline rows={3} margin="normal" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          <TextField
            select
            label="Assigned officer"
            fullWidth
            margin="normal"
            value={form.assignedOfficer}
            onChange={(e) => setForm({ ...form, assignedOfficer: e.target.value })}
          >
            {['Ravi Shankar', 'Anitha Kumar', 'Suresh Babu', 'Divya Prakash', 'Mohan Raj'].map((o) => (
              <MenuItem key={o} value={o}>{o}</MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ p: 2.5 }}>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreate} disabled={createCase.isPending} sx={{ bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}>
            {createCase.isPending ? 'Creating…' : 'Create case'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
