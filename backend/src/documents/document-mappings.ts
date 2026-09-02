import { DocumentType } from '@prisma/client';

// DB enum -> what the frontend shows/sends as `type`.
export const DOC_TYPE_TO_DISPLAY: Record<DocumentType, string> = {
  fir: 'FIR',
  chargesheet: 'Chargesheet',
  witness_statement: 'Witness Statement',
  forensic_report: 'Forensic Report',
  court_order: 'Court Order',
  arrest_memo: 'Arrest Memo',
  evidence_photo: 'Evidence Photo',
  medical_report: 'Medical Report',
  legal_notice: 'Legal Notice',
  affidavit: 'Affidavit',
  other: 'Other',
};

const DISPLAY_TO_DOC_TYPE: Record<string, DocumentType> = Object.fromEntries(
  Object.entries(DOC_TYPE_TO_DISPLAY).map(([dbValue, display]) => [display.toLowerCase(), dbValue as DocumentType]),
);

// Tolerant mapper for whatever Deepak's AI service (or its mock) returns —
// tries an exact enum value, then a display-string match, falls back to 'other'.
export function toDocumentType(raw: string | undefined | null): DocumentType {
  if (!raw) return DocumentType.other;
  const lower = raw.toLowerCase().replace(/\s+/g, '_');
  if (lower in DocumentType) return lower as DocumentType;
  const byDisplay = DISPLAY_TO_DOC_TYPE[raw.toLowerCase()];
  return byDisplay ?? DocumentType.other;
}

export function formatFileSize(bytes: bigint | number): string {
  const n = typeof bytes === 'bigint' ? Number(bytes) : bytes;
  if (n < 1024) return `${n} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = n / 1024;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex++;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}
