import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import { useNavigate } from 'react-router-dom';
import StatCard from '../components/StatCard';
import StatusBadge from '../components/StatusBadge';
import { useDocuments } from '../hooks/useDocuments';
import { useCases } from '../hooks/useCases';
import { useAuditLog } from '../hooks/useAudit';
import { useAuth } from '../hooks/useAuth';
import { StatCardsSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { formatDistanceToNow } from 'date-fns';
import { palette } from '../theme';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutlineOutlined';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: documents = [], isLoading: docsLoading, isError: docsError, refetch: refetchDocs } = useDocuments({});
  const { data: cases = [] } = useCases();
  const { data: audit = [], isLoading: auditLoading } = useAuditLog();
  const navigate = useNavigate();

  const statsLoading = docsLoading;

  const isAdmin = user?.role === 'ADMIN';
  const myDocs = isAdmin ? documents : documents.slice(0, Math.max(6, documents.length / 3));
  const myCases = isAdmin ? cases : cases.filter((c) => c.assignedOfficer === user?.name || isAdmin);
  const effectiveCases = myCases.length ? myCases : cases;

  const stats = [
    { label: isAdmin ? 'Total Cases' : 'My Cases', value: isAdmin ? cases.length : effectiveCases.length, kind: 'default' as const },
    { label: 'Pending Approvals', value: documents.filter((d) => d.status === 'PENDING_SIGNATURE').length, kind: 'warning' as const },
    { label: 'Recent Uploads', value: myDocs.length, kind: 'default' as const },
    {
      label: 'Verified / Tampered',
      value: `${documents.filter((d) => d.status === 'VERIFIED').length} / ${documents.filter((d) => d.status === 'TAMPERED').length}`,
      kind: documents.some((d) => d.status === 'TAMPERED') ? ('error' as const) : ('success' as const),
    },
  ];

  const quickActions = [
    { label: 'Upload Document', icon: UploadFileOutlinedIcon, path: '/upload', roles: ['ADMIN', 'IO', 'FORENSIC'] },
    { label: 'Search Documents', icon: SearchOutlinedIcon, path: '/documents', roles: ['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] },
    { label: 'New Case', icon: AddCircleOutlineIcon, path: '/cases', roles: ['ADMIN', 'IO'] },
  ].filter((a) => (user ? a.roles.includes(user.role) : false));

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>
        Welcome back, {user?.name?.split(' ')[0]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {isAdmin ? 'System-wide overview' : 'Here is what needs your attention today'}
      </Typography>

      {docsError ? (
        <ErrorState message="Couldn't load dashboard data." onRetry={() => refetchDocs()} />
      ) : statsLoading ? (
        <StatCardsSkeleton count={4} />
      ) : (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {stats.map((s) => (
            <Grid key={s.label} size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard data={s} onClick={() => navigate('/documents')} />
            </Grid>
          ))}
        </Grid>
      )}

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>
              Recent activity
            </Typography>
            {auditLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ height: 14, bgcolor: '#EAE7DA', borderRadius: 1, width: `${70 - i * 5}%` }} />
                ))}
              </Box>
            ) : audit.length === 0 ? (
              <EmptyState title="No recent activity" description="Actions across the system will appear here." />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                {audit.slice(0, 8).map((a) => (
                  <Box key={a.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1.2, borderBottom: '1px solid #EAE7DA' }}>
                    <Box>
                      <Typography variant="body2">
                        <strong>{a.actor}</strong> {a.action.toLowerCase()} <span className="font-mono-data">{a.target}</span>
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Quick actions
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {quickActions.map((a) => (
                <Button
                  key={a.path}
                  onClick={() => navigate(a.path)}
                  variant="outlined"
                  startIcon={<a.icon fontSize="small" />}
                  sx={{ justifyContent: 'flex-start', borderColor: '#E2DFD1', color: palette.registry }}
                >
                  {a.label}
                </Button>
              ))}
            </Box>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
              Recently uploaded
            </Typography>
            {docsLoading ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Box key={i} sx={{ height: 14, bgcolor: '#EAE7DA', borderRadius: 1 }} />
                ))}
              </Box>
            ) : myDocs.length === 0 ? (
              <EmptyState title="No uploads yet" description="Documents you upload will show up here." />
            ) : (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.2 }}>
                {myDocs.slice(0, 5).map((d) => (
                  <Box key={d.id} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }} onClick={() => navigate(`/documents/${d.id}`)}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>{d.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{d.caseId}</Typography>
                    </Box>
                    <StatusBadge status={d.status} />
                  </Box>
                ))}
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
