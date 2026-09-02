import type {
  AuthUser,
  DocumentItem,
  CaseItem,
  AuditEntry,
  NotificationItem,
  VersionEntry,
  Role,
} from '../types';

export const mockUsers: Record<Role, AuthUser> = {
  ADMIN: { id: 'u1', name: 'Priya Nandakumar', email: 'priya.admin@sentineldms.gov', role: 'ADMIN', avatarInitials: 'PN' },
  IO: { id: 'u2', name: 'Ravi Shankar', email: 'ravi.io@sentineldms.gov', role: 'IO', avatarInitials: 'RS' },
  JUDGE: { id: 'u3', name: 'Justice A. Meenakshi', email: 'meenakshi.judge@sentineldms.gov', role: 'JUDGE', avatarInitials: 'AM' },
  FORENSIC: { id: 'u4', name: 'Dr. Karthik Subramaniam', email: 'karthik.forensic@sentineldms.gov', role: 'FORENSIC', avatarInitials: 'KS' },
  AUDITOR: { id: 'u5', name: 'Court Observer', email: 'observer@sentineldms.gov', role: 'AUDITOR', avatarInitials: 'CO' },
};

const docTypes = ['Witness Statement', 'FIR', 'Forensic Report', 'Warrant', 'Chargesheet', 'Evidence Photo Log', 'Medical Report'];
const officers = ['Ravi Shankar', 'Anitha Kumar', 'Suresh Babu', 'Divya Prakash', 'Mohan Raj'];

function pad(n: number) {
  return n.toString().padStart(3, '0');
}

export const mockCases: CaseItem[] = Array.from({ length: 18 }).map((_, i) => {
  const statuses: CaseItem['status'][] = ['OPEN', 'UNDER_REVIEW', 'CLOSED'];
  const status = statuses[i % 3];
  return {
    id: `CASE-2026-${pad(i + 1)}`,
    title: [
      'State vs. Kumar — Cyber Fraud',
      'Property Dispute — Anna Nagar',
      'Theft Investigation — RS Puram',
      'Assault Case — Peelamedu',
      'Financial Fraud — Textile Mill Co.',
      'Missing Person — Saibaba Colony',
    ][i % 6],
    status,
    assignedOfficer: officers[i % officers.length],
    documentCount: 3 + (i % 12),
    createdAt: new Date(2026, i % 8, (i % 27) + 1).toISOString(),
    updatedAt: new Date(2026, 7, (i % 27) + 1).toISOString(),
    description:
      'Case file consolidating first information report, witness statements, and supporting forensic evidence gathered during investigation.',
  };
});

export const mockDocuments: DocumentItem[] = Array.from({ length: 42 }).map((_, i) => {
  const statuses: DocumentItem['status'][] = ['VERIFIED', 'VERIFIED', 'VERIFIED', 'PENDING_SIGNATURE', 'UNSIGNED', 'TAMPERED'];
  const status = statuses[i % statuses.length];
  const c = mockCases[i % mockCases.length];
  return {
    id: `DOC-${pad(i + 1)}`,
    title: `${docTypes[i % docTypes.length]} #${pad(i + 1)}`,
    caseId: c.id,
    caseTitle: c.title,
    type: docTypes[i % docTypes.length],
    status,
    uploadedBy: officers[i % officers.length],
    uploadedAt: new Date(2026, 7, (i % 27) + 1, (i * 3) % 24).toISOString(),
    fileSize: `${(1 + (i % 8) * 0.4).toFixed(1)} MB`,
    classificationConfidence: 78 + (i % 20),
    blockchainHash: status === 'VERIFIED' ? `0x${(i + 1).toString(16).padStart(8, '0')}a1c9…f${i}` : undefined,
  };
});

export const mockVersions: VersionEntry[] = [
  { version: 3, changedBy: 'Ravi Shankar', changedAt: new Date(2026, 7, 20, 14, 10).toISOString(), note: 'Re-uploaded after scan quality fix' },
  { version: 2, changedBy: 'Dr. Karthik Subramaniam', changedAt: new Date(2026, 7, 18, 9, 45).toISOString(), note: 'Added forensic annotation layer' },
  { version: 1, changedBy: 'Ravi Shankar', changedAt: new Date(2026, 7, 15, 11, 0).toISOString(), note: 'Initial upload' },
];

const actions = ['Viewed document', 'Uploaded document', 'Signed document', 'Verified on blockchain', 'Updated case status', 'Exported report', 'Reset MFA for user'];

export const mockAuditLog: AuditEntry[] = Array.from({ length: 60 }).map((_, i) => ({
  id: `AUD-${pad(i + 1)}`,
  actor: officers[i % officers.length],
  role: (['ADMIN', 'IO', 'JUDGE', 'FORENSIC'] as Role[])[i % 4],
  action: actions[i % actions.length],
  target: mockDocuments[i % mockDocuments.length].id,
  timestamp: new Date(2026, 7, (i % 27) + 1, (i * 5) % 24, (i * 7) % 60).toISOString(),
}));

export const mockNotifications: NotificationItem[] = [
  { id: 'n1', message: 'Document DOC-006 flagged as tampered — review required', read: false, timestamp: new Date(2026, 7, 27, 16, 20).toISOString(), kind: 'error' },
  { id: 'n2', message: 'CASE-2026-004 moved to Under Review', read: false, timestamp: new Date(2026, 7, 27, 11, 5).toISOString(), kind: 'info' },
  { id: 'n3', message: 'Your signature is requested on DOC-014', read: false, timestamp: new Date(2026, 7, 26, 9, 30).toISOString(), kind: 'warning' },
  { id: 'n4', message: 'DOC-021 verified on blockchain successfully', read: true, timestamp: new Date(2026, 7, 25, 15, 0).toISOString(), kind: 'success' },
  { id: 'n5', message: 'MFA reset completed for Divya Prakash', read: true, timestamp: new Date(2026, 7, 24, 10, 0).toISOString(), kind: 'info' },
];

export const mockUserList = officers.map((name, i) => ({
  id: `usr-${i + 1}`,
  name,
  email: `${name.toLowerCase().replace(' ', '.')}@sentineldms.gov`,
  role: (['IO', 'FORENSIC', 'ADMIN', 'JUDGE'] as Role[])[i % 4],
  status: i % 5 === 0 ? 'Invited' : 'Active',
}));
