import { useState } from 'react';
import { useParams, Link as RouterLink, useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Grid from '@mui/material/Grid';
import { format } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import { DetailSkeleton, TableSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useCase, useCaseDocuments, useUpdateCaseStatus } from '../hooks/useCases';
import type { CaseStatus } from '../types';

const statusOptions: CaseStatus[] = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];

export default function CaseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: caseItem, isLoading, isError, refetch } = useCase(id);
  const { data: documents = [], isLoading: docsLoading } = useCaseDocuments(id);
  const updateStatus = useUpdateCaseStatus();
  const navigate = useNavigate();
  const [status, setStatus] = useState<CaseStatus | ''>('');

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState message="Couldn't load this case." onRetry={() => refetch()} />;
  if (!caseItem) return <EmptyState title="Case not found" description="It may have been removed, or the link is incorrect." />;

  const currentStatus = status || caseItem.status;

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.85rem' }}>
        <Link component={RouterLink} to="/cases" underline="hover" color="text.secondary">Cases</Link>
        <Typography color="text.primary" variant="body2">{caseItem.id}</Typography>
      </Breadcrumbs>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>{caseItem.title}</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{caseItem.description}</Typography>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #E2DFD1' }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Linked documents ({documents.length})</Typography>
            </Box>
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F6F5EE' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Uploaded</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                {!docsLoading && (
                  <TableBody>
                    {documents.map((d) => (
                      <TableRow key={d.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${d.id}`)}>
                        <TableCell sx={{ fontWeight: 500 }}>{d.title}</TableCell>
                        <TableCell>{d.type}</TableCell>
                        <TableCell>{format(new Date(d.uploadedAt), 'dd MMM yyyy')}</TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                )}
              </Table>
            </Box>
            {docsLoading && <TableSkeleton rows={3} cols={4} />}
            {!docsLoading && documents.length === 0 && (
              <EmptyState title="No documents linked yet" description="Documents uploaded and linked to this case will show up here." />
            )}
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Case details</Typography>
            {[
              ['Case ID', caseItem.id],
              ['Assigned officer', caseItem.assignedOfficer],
              ['Created', format(new Date(caseItem.createdAt), 'dd MMM yyyy')],
              ['Last updated', format(new Date(caseItem.updatedAt), 'dd MMM yyyy')],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9, borderBottom: '1px solid #EAE7DA' }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
              </Box>
            ))}

            <TextField
              select
              label="Status"
              fullWidth
              size="small"
              value={currentStatus}
              onChange={(e) => {
                const v = e.target.value as CaseStatus;
                setStatus(v);
                updateStatus.mutate({ id: caseItem.id, status: v });
              }}
              sx={{ mt: 2.5 }}
            >
              {statusOptions.map((s) => (
                <MenuItem key={s} value={s}>{s.replace('_', ' ')}</MenuItem>
              ))}
            </TextField>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
