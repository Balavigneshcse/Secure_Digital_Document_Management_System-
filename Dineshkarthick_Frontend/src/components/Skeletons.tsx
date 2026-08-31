import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <Box>
      {Array.from({ length: rows }).map((_, r) => (
        <Box key={r} sx={{ display: 'flex', gap: 3, px: 2, py: 1.4, borderBottom: '1px solid #EAE7DA' }}>
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} variant="text" width={c === 0 ? '20%' : `${100 / cols}%`} height={20} />
          ))}
        </Box>
      ))}
    </Box>
  );
}

export function CardGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={140} />
      ))}
    </Box>
  );
}

export function StatCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 2, mb: 3 }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} variant="rounded" height={100} />
      ))}
    </Box>
  );
}

export function DetailSkeleton() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Skeleton variant="text" width="40%" height={36} />
      <Skeleton variant="text" width="25%" height={20} />
      <Skeleton variant="rounded" height={300} sx={{ mt: 2 }} />
    </Box>
  );
}
