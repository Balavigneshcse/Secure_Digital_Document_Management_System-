import Chip from '@mui/material/Chip';
import type { DocumentStatus } from '../types';
import { palette } from '../theme';
import Seal from './Seal';

const config: Record<DocumentStatus, { label: string; dot: string; bg: string; fg: string }> = {
  VERIFIED: { label: 'Verified', dot: palette.verified, bg: '#E5EFE9', fg: '#204E3A' },
  TAMPERED: { label: 'Tampered', dot: palette.tampered, bg: '#F5E4E0', fg: '#7A2A1E' },
  PENDING_SIGNATURE: { label: 'Pending Signature', dot: palette.pending, bg: '#F5E9D4', fg: '#6E4F16' },
  UNSIGNED: { label: 'Unsigned', dot: palette.unsigned, bg: '#E9E7DD', fg: '#565247' },
};

export default function StatusBadge({ status }: { status: DocumentStatus }) {
  const c = config[status];
  return (
    <Chip
      size="small"
      label={c.label}
      sx={{
        bgcolor: c.bg,
        color: c.fg,
        '& .MuiChip-label': { display: 'flex', alignItems: 'center', gap: '6px', px: '10px' },
      }}
      icon={
        status === 'VERIFIED' ? (
          <Seal size={13} color={palette.verified} />
        ) : (
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              backgroundColor: c.dot,
              display: 'inline-block',
              marginLeft: 8,
            }}
          />
        )
      }
    />
  );
}
