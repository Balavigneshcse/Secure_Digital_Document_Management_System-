import { useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { useAuditLog } from '../hooks/useAudit';
import { TableSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { palette } from '../theme';
import type { Role } from '../types';

export default function AuditPage() {
  const { data: audit = [], isLoading, isError, refetch } = useAuditLog();
  const [roleFilter, setRoleFilter] = useState<Role | ''>('');
  const [actionFilter, setActionFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const actionTypes = useMemo(() => Array.from(new Set(audit.map((a) => a.action))), [audit]);

  const filtered = audit.filter((a) => {
    if (roleFilter && a.role !== roleFilter) return false;
    if (actionFilter && a.action !== actionFilter) return false;
    if (dateFrom && new Date(a.timestamp) < new Date(dateFrom)) return false;
    if (dateTo && new Date(a.timestamp) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  const handleExport = () => {
    const header = ['ID', 'Actor', 'Role', 'Action', 'Target', 'Timestamp'];
    const rows = filtered.map((a) => [a.id, a.actor, a.role, a.action, a.target, a.timestamp]);
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `sentineldms-audit-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const activityOverTime = useMemo(() => {
    const byDay: Record<string, number> = {};
    filtered.forEach((a) => {
      const day = format(new Date(a.timestamp), 'dd MMM');
      byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.entries(byDay).map(([day, count]) => ({ day, count })).slice(-14);
  }, [filtered]);

  const byRole = useMemo(() => {
    const counts: Record<string, number> = {};
    filtered.forEach((a) => {
      counts[a.role] = (counts[a.role] || 0) + 1;
    });
    return Object.entries(counts).map(([role, count]) => ({ role, count }));
  }, [filtered]);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>Audit & Compliance</Typography>
          <Typography variant="body2" color="text.secondary">System-wide activity, filterable by role.</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} sx={{ borderColor: '#E2DFD1', color: palette.registry }}>
          Export Report
        </Button>
      </Box>

      {isError ? (
        <ErrorState message="Couldn't load the audit log." onRetry={() => refetch()} />
      ) : (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, height: 300 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Activity over time</Typography>
                {isLoading ? (
                  <Box sx={{ height: '85%', bgcolor: '#F3F2EA', borderRadius: 1 }} />
                ) : (
                  <ResponsiveContainer width="100%" height="85%">
                    <LineChart data={activityOverTime}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DA" />
                      <XAxis dataKey="day" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Line type="monotone" dataKey="count" stroke={palette.registry} strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, height: 300 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>Actions by role</Typography>
                {isLoading ? (
                  <Box sx={{ height: '85%', bgcolor: '#F3F2EA', borderRadius: 1 }} />
                ) : (
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={byRole}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EAE7DA" />
                      <XAxis dataKey="role" fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="count" fill={palette.registry} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Paper>
            </Grid>
          </Grid>

          <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', mb: 2 }}>
            <TextField
              select
              size="small"
              label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as Role | '')}
              sx={{ width: 180 }}
            >
              <MenuItem value="">All roles</MenuItem>
              {(['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] as Role[]).map((r) => (
                <MenuItem key={r} value={r}>{r}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              size="small"
              label="Action type"
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              sx={{ width: 220 }}
            >
              <MenuItem value="">All actions</MenuItem>
              {actionTypes.map((a) => (
                <MenuItem key={a} value={a}>{a}</MenuItem>
              ))}
            </TextField>

            <TextField
              type="date"
              size="small"
              label="From"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
            <TextField
              type="date"
              size="small"
              label="To"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
              sx={{ width: 160 }}
            />
          </Box>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, overflow: 'hidden' }}>
            {isLoading ? (
              <TableSkeleton rows={8} cols={5} />
            ) : filtered.length === 0 ? (
              <EmptyState title="No activity matches your filters" description="Try widening the date range or clearing a filter." />
            ) : (
              <Box sx={{ overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ bgcolor: '#F6F5EE' }}>
                      <TableCell sx={{ fontWeight: 700 }}>Actor</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Action</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Target</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Timestamp</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filtered.slice(0, 30).map((a) => (
                      <TableRow key={a.id} hover>
                        <TableCell>{a.actor}</TableCell>
                        <TableCell>{a.role}</TableCell>
                        <TableCell>{a.action}</TableCell>
                        <TableCell className="font-mono-data" sx={{ fontSize: '0.78rem' }}>{a.target}</TableCell>
                        <TableCell>{format(new Date(a.timestamp), 'dd MMM yyyy, HH:mm')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}
          </Paper>
        </>
      )}
    </Box>
  );
}
