import { useState, useCallback, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Paper from '@mui/material/Paper';
import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Divider from '@mui/material/Divider';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import DescriptionOutlinedIcon from '@mui/icons-material/DescriptionOutlined';
import TextSnippetOutlinedIcon from '@mui/icons-material/TextSnippetOutlined';
import { useCases } from '../hooks/useCases';
import { useUploadDocument } from '../hooks/useDocuments';
import { palette } from '../theme';

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.png', '.tiff'];
const MAX_SIZE_MB = 25;

export default function UploadPage() {
  const { data: cases = [] } = useCases();
  const uploadMutation = useUploadDocument();
  const [file, setFile] = useState<File | null>(null);
  const [caseId, setCaseId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [result, setResult] = useState<{ id: string; classification: string; confidence: number; ocrText: string } | null>(null);
  const [overridden, setOverridden] = useState(false);
  const [fileError, setFileError] = useState('');
  const [progress, setProgress] = useState(0);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const validateAndSetFile = (candidate: File) => {
    const ext = candidate.name.slice(candidate.name.lastIndexOf('.')).toLowerCase();
    const typeOk = ACCEPTED_TYPES.includes(candidate.type) || ACCEPTED_EXT.includes(ext);
    if (!typeOk) {
      setFileError('Unsupported file type. Use PDF, JPG, PNG, or TIFF.');
      setFile(null);
      return;
    }
    if (candidate.size > MAX_SIZE_MB * 1024 * 1024) {
      setFileError(`File is ${(candidate.size / (1024 * 1024)).toFixed(1)} MB — max allowed is ${MAX_SIZE_MB} MB.`);
      setFile(null);
      return;
    }
    setFileError('');
    setFile(candidate);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.[0]) validateAndSetFile(e.dataTransfer.files[0]);
  }, []);

  const handleUpload = async () => {
    if (!file || !caseId) return;
    setResult(null);
    setOverridden(false);
    setProgress(0);

    // Simulate real upload progress until the mock network call resolves.
    progressTimer.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + Math.random() * 12));
    }, 180);

    const res = await uploadMutation.mutateAsync({ file, caseId });

    if (progressTimer.current) clearInterval(progressTimer.current);
    setProgress(100);
    setResult(res);
  };

  return (
    <Box sx={{ maxWidth: 720 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 0.3 }}>Upload Document</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Drop a file, link it to a case, and let classification run automatically.
      </Typography>

      <TextField
        select
        label="Link to Case"
        fullWidth
        value={caseId}
        onChange={(e) => setCaseId(e.target.value)}
        sx={{ mb: 2.5 }}
      >
        {cases.map((c) => (
          <MenuItem key={c.id} value={c.id}>
            {c.id} — {c.title}
          </MenuItem>
        ))}
      </TextField>

      <Paper
        elevation={0}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        sx={{
          border: `2px dashed ${dragOver ? palette.registry : '#D8D5C6'}`,
          bgcolor: dragOver ? 'rgba(30,58,95,0.04)' : '#F6F5EE',
          borderRadius: 2,
          p: 5,
          textAlign: 'center',
          transition: 'all 0.15s',
        }}
      >
        <UploadFileOutlinedIcon sx={{ fontSize: 40, color: palette.registry, mb: 1 }} />
        <Typography sx={{ fontWeight: 600, mb: 0.5 }}>
          {file ? file.name : 'Drag & drop a file here'}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          PDF, JPG, PNG, or TIFF — up to 25 MB
        </Typography>
        <Button variant="outlined" component="label" sx={{ borderColor: '#D8D5C6', color: palette.registry }}>
          Browse files
          <input
            type="file"
            hidden
            accept=".pdf,.jpg,.jpeg,.png,.tiff"
            onChange={(e) => e.target.files?.[0] && validateAndSetFile(e.target.files[0])}
          />
        </Button>
        {file && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
            {(file.size / (1024 * 1024)).toFixed(2)} MB
          </Typography>
        )}
      </Paper>

      {fileError && <Alert severity="error" sx={{ mt: 1.5 }}>{fileError}</Alert>}

      <Button
        fullWidth
        variant="contained"
        size="large"
        disabled={!file || !caseId || uploadMutation.isPending}
        onClick={handleUpload}
        sx={{ mt: 2.5, bgcolor: palette.registry, '&:hover': { bgcolor: palette.registryDark } }}
      >
        {uploadMutation.isPending ? `Uploading & classifying… ${Math.min(99, Math.round(progress))}%` : 'Upload document'}
      </Button>

      {uploadMutation.isPending && (
        <LinearProgress variant="determinate" value={Math.min(progress, 99)} sx={{ mt: 1.5, borderRadius: 1, height: 6 }} />
      )}

      {result && (
        <Paper elevation={0} sx={{ mt: 3, p: 2.5, border: '1px solid #E2DFD1', borderRadius: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
            <DescriptionOutlinedIcon sx={{ color: palette.verified }} />
            <Typography sx={{ fontWeight: 700 }}>Upload complete — {result.id}</Typography>
          </Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            Detected: <strong>{overridden ? 'Manually classified' : result.classification}</strong>
            {!overridden && `, ${result.confidence}% confidence`}
          </Alert>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
            <Chip label={result.classification} color="default" />
            {!overridden && (
              <Button size="small" onClick={() => setOverridden(true)}>
                Override classification
              </Button>
            )}
          </Box>
          {overridden && (
            <TextField select label="Correct document type" fullWidth size="small" sx={{ mt: 2 }} defaultValue={result.classification}>
              {['Witness Statement', 'FIR', 'Forensic Report', 'Warrant', 'Chargesheet', 'Evidence Photo Log', 'Medical Report'].map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </TextField>
          )}

          <Divider sx={{ my: 2.5 }} />

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.2 }}>
            <TextSnippetOutlinedIcon fontSize="small" sx={{ color: '#8B8677' }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>OCR preview</Typography>
          </Box>
          <Paper
            elevation={0}
            sx={{ bgcolor: '#F3F2EA', border: '1px solid #E2DFD1', borderRadius: 1.5, p: 1.8, maxHeight: 160, overflowY: 'auto' }}
          >
            <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: '0.8rem', lineHeight: 1.6 }}>
              {result.ocrText}
            </Typography>
          </Paper>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.8 }}>
            Extracted text will be indexed for semantic search once confirmed.
          </Typography>
        </Paper>
      )}
    </Box>
  );
}
