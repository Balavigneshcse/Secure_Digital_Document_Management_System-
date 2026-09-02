import { useState, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import InputBase from '@mui/material/InputBase';
import Chip from '@mui/material/Chip';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Table from '@mui/material/Table';
import TableHead from '@mui/material/TableHead';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import Grid from '@mui/material/Grid';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Tooltip from '@mui/material/Tooltip';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import ViewListOutlinedIcon from '@mui/icons-material/ViewListOutlined';
import ViewModuleOutlinedIcon from '@mui/icons-material/ViewModuleOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import StatusBadge from '../components/StatusBadge';
import { TableSkeleton, CardGridSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useDocuments } from '../hooks/useDocuments';
import { useCases } from '../hooks/useCases';
import { palette } from '../theme';
import type { DocumentStatus } from '../types';

const statusFilters: { label: string; value: DocumentStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Tampered', value: 'TAMPERED' },
  { label: 'Pending Signature', value: 'PENDING_SIGNATURE' },
  { label: 'Unsigned', value: 'UNSIGNED' },
];

export default function DocumentsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<DocumentStatus | ''>('');
  const [searchMode, setSearchMode] = useState<'keyword' | 'semantic'>('keyword');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const navigate = useNavigate();
  const { data: documents = [], isLoading, isError, refetch } = useDocuments({ query, status: status || undefined });
  const { data: cases = [] } = useCases();

  const types = useMemo(() => Array.from(new Set(documents.map((d) => d.type))), [documents]);
  const uploaders = useMemo(() => Array.from(new Set(documents.map((d) => d.uploadedBy))), [documents]);
  const [typeFilter, setTypeFilter] = useState('');
  const [caseFilter, setCaseFilter] = useState('');
  const [uploaderFilter, setUploaderFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filtered = documents.filter((d) => {
    if (typeFilter && d.type !== typeFilter) return false;
    if (caseFilter && d.caseId !== caseFilter) return false;
    if (uploaderFilter && d.uploadedBy !== uploaderFilter) return false;
    if (dateFrom && new Date(d.uploadedAt) < new Date(dateFrom)) return false;
    if (dateTo && new Date(d.uploadedAt) > new Date(`${dateTo}T23:59:59`)) return false;
    return true;
  });

  const activeFilterCount = [typeFilter, caseFilter, uploaderFilter, dateFrom, dateTo].filter(Boolean).length;
  const clearFilters = () => {
    setTypeFilter('');
    setCaseFilter('');
    setUploaderFilter('');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>Documents</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Search across all documents by keyword, case, or metadata.
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
        <Box
          sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#EBE9DE', borderRadius: 2, px: 1.5, py: 0.8, maxWidth: 480, flex: 1, minWidth: 260 }}
        >
          <SearchIcon fontSize="small" sx={{ color: '#8B8677' }} />
          <InputBase
            placeholder={searchMode === 'semantic' ? 'Describe what you\'re looking for…' : 'Search by title, case ID, or keyword…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            fullWidth
            sx={{ fontSize: '0.9rem' }}
          />
        </Box>

        <ToggleButtonGroup value={searchMode} exclusive size="small" onChange={(_, v) => v && setSearchMode(v)}>
          <ToggleButton value="keyword" sx={{ px: 1.5, fontSize: '0.75rem' }}>Keyword</ToggleButton>
          <ToggleButton value="semantic" sx={{ px: 1.5, fontSize: '0.75rem' }}>Semantic</ToggleButton>
        </ToggleButtonGroup>

        <Box sx={{ flex: 1 }} />

        <ToggleButtonGroup value={viewMode} exclusive size="small" onChange={(_, v) => v && setViewMode(v)}>
          <ToggleButton value="list"><Tooltip title="List view"><ViewListOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
          <ToggleButton value="grid"><Tooltip title="Grid view"><ViewModuleOutlinedIcon fontSize="small" /></Tooltip></ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {searchMode === 'semantic' && (
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: -1.5, mb: 2 }}>
          Semantic search matches meaning, not just exact text — e.g. "documents about a break-in" finds relevant reports even without those exact words.
        </Typography>
      )}

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        {statusFilters.map((f) => (
          <Chip
            key={f.label}
            label={f.label}
            onClick={() => setStatus(f.value)}
            variant={status === f.value ? 'filled' : 'outlined'}
            color={status === f.value ? 'primary' : 'default'}
            size="small"
          />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
        <Chip label="All types" onClick={() => setTypeFilter('')} variant={typeFilter === '' ? 'filled' : 'outlined'} size="small" />
        {types.map((t) => (
          <Chip key={t} label={t} onClick={() => setTypeFilter(t)} variant={typeFilter === t ? 'filled' : 'outlined'} size="small" />
        ))}
      </Box>

      <Box sx={{ display: 'flex', gap: 1.2, flexWrap: 'wrap', alignItems: 'center', mb: 2.5 }}>
        <TextField
          select
          size="small"
          label="Case ID"
          value={caseFilter}
          onChange={(e) => setCaseFilter(e.target.value)}
          sx={{ minWidth: 180 }}
        >
          <MenuItem value="">All cases</MenuItem>
          {cases.map((c) => (
            <MenuItem key={c.id} value={c.id}>{c.id}</MenuItem>
          ))}
        </TextField>

        <TextField
          select
          size="small"
          label="Uploaded by"
          value={uploaderFilter}
          onChange={(e) => setUploaderFilter(e.target.value)}
          sx={{ minWidth: 170 }}
        >
          <MenuItem value="">Anyone</MenuItem>
          {uploaders.map((u) => (
            <MenuItem key={u} value={u}>{u}</MenuItem>
          ))}
        </TextField>

        <TextField
          type="date"
          size="small"
          label="From"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />
        <TextField
          type="date"
          size="small"
          label="To"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          slotProps={{ inputLabel: { shrink: true } }}
          sx={{ minWidth: 150 }}
        />

        {activeFilterCount > 0 && (
          <Chip
            label={`Clear ${activeFilterCount} filter${activeFilterCount > 1 ? 's' : ''}`}
            size="small"
            onDelete={clearFilters}
            deleteIcon={<CloseIcon fontSize="small" />}
            onClick={clearFilters}
            variant="outlined"
          />
        )}
      </Box>

      {isError ? (
        <ErrorState message="Couldn't load documents." onRetry={() => refetch()} />
      ) : viewMode === 'list' ? (
        <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, overflow: 'hidden' }}>
          {isLoading ? (
            <TableSkeleton rows={7} cols={6} />
          ) : filtered.length === 0 ? (
            <EmptyState title="No documents match your filters" description="Try widening your search or clearing a filter." />
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: '#F6F5EE' }}>
                    <TableCell sx={{ fontWeight: 700 }}>Title</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Case</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Uploaded by</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((d) => (
                    <TableRow key={d.id} hover sx={{ cursor: 'pointer' }} onClick={() => navigate(`/documents/${d.id}`)}>
                      <TableCell sx={{ fontWeight: 500 }}>{d.title}</TableCell>
                      <TableCell>
                        <Typography variant="body2" className="font-mono-data" sx={{ fontSize: '0.78rem' }}>{d.caseId}</Typography>
                      </TableCell>
                      <TableCell>{d.type}</TableCell>
                      <TableCell>{d.uploadedBy}</TableCell>
                      <TableCell>{format(new Date(d.uploadedAt), 'dd MMM yyyy')}</TableCell>
                      <TableCell><StatusBadge status={d.status} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
        </Paper>
      ) : (
        <>
          {isLoading && <CardGridSkeleton count={8} />}
          {!isLoading && filtered.length === 0 && (
            <EmptyState title="No documents match your filters" description="Try widening your search or clearing a filter." />
          )}
          {!isLoading && filtered.length > 0 && (
            <Grid container spacing={2}>
              {filtered.map((d) => (
                <Grid key={d.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
                  <Paper
                    elevation={0}
                    onClick={() => navigate(`/documents/${d.id}`)}
                    sx={{
                      border: '1px solid #E2DFD1',
                      borderRadius: 2,
                      p: 2,
                      cursor: 'pointer',
                      height: '100%',
                      transition: 'box-shadow 0.15s, transform 0.15s',
                      '&:hover': { boxShadow: '0 4px 16px rgba(15,27,45,0.08)', transform: 'translateY(-1px)' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <DescriptionOutlinedIcon sx={{ color: palette.registry }} />
                      <StatusBadge status={d.status} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.3 }} noWrap>{d.title}</Typography>
                    <Typography variant="caption" color="text.secondary" className="font-mono-data" sx={{ display: 'block', mb: 0.8 }}>
                      {d.caseId}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {d.type} · {d.fileSize}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.3 }}>
                      {d.uploadedBy} · {format(new Date(d.uploadedAt), 'dd MMM yyyy')}
                    </Typography>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}
    </Box>
  );
}
