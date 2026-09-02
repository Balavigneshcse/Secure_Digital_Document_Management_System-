import { useState } from 'react';
import { useParams, Link as RouterLink } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Grid from '@mui/material/Grid';
import Divider from '@mui/material/Divider';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Link from '@mui/material/Link';
import VerifiedUserOutlinedIcon from '@mui/icons-material/VerifiedUserOutlined';
import DrawOutlinedIcon from '@mui/icons-material/DrawOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import { format } from 'date-fns';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import StatusBadge from '../components/StatusBadge';
import Seal from '../components/Seal';
import { DetailSkeleton } from '../components/Skeletons';
import ErrorState from '../components/ErrorState';
import EmptyState from '../components/EmptyState';
import { useDocument, useDocumentVersions, useVerifyOnBlockchain, useSignDocument } from '../hooks/useDocuments';
import { useDocumentAuditTrail } from '../hooks/useAudit';
import { palette } from '../theme';

// Deterministic pseudo-random line widths so the mock "page" looks like real
// typed content but stays stable across re-renders for the same document.
function seededLines(seed: string, count: number) {
  let x = Array.from(seed).reduce((a, c) => a + c.charCodeAt(0), 0);
  return Array.from({ length: count }).map(() => {
    x = (x * 9301 + 49297) % 233280;
    return 55 + (x / 233280) * 40; // width % between 55-95
  });
}

function DocumentPagePreview({ docId, docType, page }: { docId: string; docType: string; page: number }) {
  const lines = seededLines(`${docId}-${page}`, 16);
  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 380,
        aspectRatio: '1 / 1.4142',
        bgcolor: '#fff',
        boxShadow: '0 2px 10px rgba(15,27,45,0.12)',
        borderRadius: 1,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Typography variant="caption" sx={{ fontWeight: 700, letterSpacing: 1, color: '#8B8677', textTransform: 'uppercase', mb: 1 }}>
        {docType} — Page {page}
      </Typography>
      {lines.map((w, i) => (
        <Box key={i} sx={{ height: 6, width: `${w}%`, bgcolor: i % 4 === 3 ? 'transparent' : '#E2DFD1', borderRadius: 0.5, mb: i % 4 === 3 ? 1 : 0 }} />
      ))}
    </Box>
  );
}

export default function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading, isError, refetch } = useDocument(id);
  const { data: versions = [] } = useDocumentVersions(id);
  const { data: auditTrail = [] } = useDocumentAuditTrail(id);
  const verifyMutation = useVerifyOnBlockchain();
  const signMutation = useSignDocument();
  const [verifiedHash, setVerifiedHash] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  if (isLoading) return <DetailSkeleton />;
  if (isError) return <ErrorState message="Couldn't load this document." onRetry={() => refetch()} />;
  if (!doc) return <EmptyState title="Document not found" description="It may have been removed, or the link is incorrect." />;

  const pageCount = Math.max(1, Math.round(parseFloat(doc.fileSize) * 1.5));

  return (
    <Box>
      <Breadcrumbs sx={{ mb: 1.5, fontSize: '0.85rem' }}>
        <Link component={RouterLink} to="/documents" underline="hover" color="text.secondary">Documents</Link>
        <Typography color="text.primary" variant="body2">{doc.id}</Typography>
      </Breadcrumbs>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{doc.title}</Typography>
          <Typography variant="body2" color="text.secondary">
            {doc.caseId} · {doc.caseTitle}
          </Typography>
        </Box>
        <StatusBadge status={doc.status} />
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper
            elevation={0}
            sx={{
              border: '1px solid #E2DFD1',
              borderRadius: 2,
              minHeight: 480,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: '#EAE7DA',
              gap: 2,
              py: 3,
            }}
          >
            <DocumentPagePreview docId={doc.id} docType={doc.type} page={page} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton size="small" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                <NavigateBeforeIcon fontSize="small" />
              </IconButton>
              <Typography variant="caption" color="text.secondary">
                Page {page} of {pageCount}
              </Typography>
              <IconButton size="small" disabled={page >= pageCount} onClick={() => setPage((p) => Math.min(pageCount, p + 1))}>
                <NavigateNextIcon fontSize="small" />
              </IconButton>
            </Box>
            <Typography color="text.secondary" variant="caption" sx={{ px: 3, textAlign: 'center' }}>
              Simulated preview — real file rendering connects once storage/viewer backend is live.
            </Typography>
          </Paper>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Metadata</Typography>
            {[
              ['Type', doc.type],
              ['Uploaded by', doc.uploadedBy],
              ['Uploaded on', format(new Date(doc.uploadedAt), 'dd MMM yyyy, HH:mm')],
              ['File size', doc.fileSize],
              ['Classification confidence', doc.classificationConfidence ? `${doc.classificationConfidence}%` : '—'],
            ].map(([label, value]) => (
              <Box key={label} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9, borderBottom: '1px solid #EAE7DA' }}>
                <Typography variant="body2" color="text.secondary">{label}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>{value}</Typography>
              </Box>
            ))}
          </Paper>

          <Paper
            elevation={0}
            sx={{
              border: `1px solid ${verifiedHash || doc.blockchainHash ? '#CFE7DA' : '#E2DFD1'}`,
              bgcolor: verifiedHash || doc.blockchainHash ? '#F3FAF6' : '#FFFFFF',
              borderRadius: 2,
              p: 2.5,
              mb: 2,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <Seal size={18} color={palette.verified} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Blockchain integrity</Typography>
            </Box>
            {(verifiedHash || doc.blockchainHash) ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Anchored hash</Typography>
                <Typography variant="body2" className="font-mono-data" sx={{ mb: 1.5, wordBreak: 'break-all' }}>
                  {verifiedHash || doc.blockchainHash}
                </Typography>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Not yet anchored on-chain.
              </Typography>
            )}
            <Button
              fullWidth
              variant="contained"
              startIcon={<VerifiedUserOutlinedIcon fontSize="small" />}
              disabled={verifyMutation.isPending}
              onClick={async () => {
                const res = await verifyMutation.mutateAsync(doc.id);
                setVerifiedHash(res.hash);
              }}
              sx={{ bgcolor: palette.verified, '&:hover': { bgcolor: '#255E45' } }}
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify on Blockchain'}
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, mb: 2 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<DrawOutlinedIcon fontSize="small" />}
              disabled={signMutation.isPending || doc.status === 'VERIFIED'}
              onClick={() => signMutation.mutate(doc.id)}
              sx={{ borderColor: '#E2DFD1', color: palette.registry }}
            >
              {signMutation.isPending ? 'Signing…' : signMutation.isSuccess ? 'Signed ✓' : 'Sign Document'}
            </Button>
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <HistoryOutlinedIcon fontSize="small" sx={{ color: '#8B8677' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Version history & audit trail</Typography>
            </Box>
            {versions.map((v, i) => (
              <Box key={v.version}>
                <Box sx={{ py: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>v{v.version} — {v.changedBy}</Typography>
                  <Typography variant="caption" color="text.secondary">{format(new Date(v.changedAt), 'dd MMM yyyy, HH:mm')}</Typography>
                  <Typography variant="body2" color="text.secondary">{v.note}</Typography>
                </Box>
                {i < versions.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>

          <Paper elevation={0} sx={{ border: '1px solid #E2DFD1', borderRadius: 2, p: 2.5, mt: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
              <VisibilityOutlinedIcon fontSize="small" sx={{ color: '#8B8677' }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Who viewed / edited</Typography>
            </Box>
            {auditTrail.length === 0 && (
              <Typography variant="body2" color="text.secondary">No access events recorded for this document yet.</Typography>
            )}
            {auditTrail.map((a, i) => (
              <Box key={a.id}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 0.9 }}>
                  <Box>
                    <Typography variant="body2">
                      <strong>{a.actor}</strong> ({a.role}) — {a.action.toLowerCase()}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap', pl: 1 }}>
                    {format(new Date(a.timestamp), 'dd MMM, HH:mm')}
                  </Typography>
                </Box>
                {i < auditTrail.length - 1 && <Divider />}
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
