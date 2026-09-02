import { palette } from '../theme';

// The one signature element of the design system: a registry seal, used only
// where the product is actually asserting trust — the login hero, the
// Verified status badge, and the blockchain integrity card. Everywhere else
// stays plain on purpose.
export default function Seal({ size = 28, color = palette.seal }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="21.5" stroke={color} strokeWidth="1.6" />
      <circle cx="24" cy="24" r="16.5" stroke={color} strokeWidth="1" strokeDasharray="1 3.4" />
      <path
        d="M24 13.5L27.1 20.2L34.5 21.1L29 26.1L30.5 33.5L24 29.8L17.5 33.5L19 26.1L13.5 21.1L20.9 20.2L24 13.5Z"
        fill={color}
      />
    </svg>
  );
}
