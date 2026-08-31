import { describe, it, expect } from 'vitest';
import { navForRole } from '../layouts/navConfig';

describe('navForRole', () => {
  it('gives Admin every nav item, including Users & Roles', () => {
    const items = navForRole('ADMIN').map((i) => i.label);
    expect(items).toContain('Users & Roles');
    expect(items).toContain('Audit & Compliance');
  });

  it('hides Users & Roles from non-admin roles', () => {
    expect(navForRole('IO').map((i) => i.label)).not.toContain('Users & Roles');
    expect(navForRole('JUDGE').map((i) => i.label)).not.toContain('Users & Roles');
    expect(navForRole('FORENSIC').map((i) => i.label)).not.toContain('Users & Roles');
  });

  it('hides Upload from Judges (read-only role)', () => {
    expect(navForRole('JUDGE').map((i) => i.label)).not.toContain('Upload');
  });

  it('gives every role access to the Dashboard and Documents', () => {
    (['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] as const).forEach((role) => {
      const labels = navForRole(role).map((i) => i.label);
      expect(labels).toContain('Dashboard');
      expect(labels).toContain('Documents');
    });
  });
});
