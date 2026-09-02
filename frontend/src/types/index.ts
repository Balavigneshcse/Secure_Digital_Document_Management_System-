// Shared types — mirror Balavignesh's backend DTOs once /api-docs is available.
// Keep this file as the single source of truth for shapes used across the app.

export type Role = 'ADMIN' | 'IO' | 'JUDGE' | 'FORENSIC' | 'AUDITOR';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarInitials: string;
}

export type DocumentStatus = 'VERIFIED' | 'TAMPERED' | 'PENDING_SIGNATURE' | 'UNSIGNED';

export interface DocumentItem {
  id: string;
  title: string;
  caseId: string;
  caseTitle: string;
  type: string; // e.g. "Witness Statement", "FIR", "Forensic Report"
  status: DocumentStatus;
  uploadedBy: string;
  uploadedAt: string; // ISO date
  fileSize: string;
  classificationConfidence?: number; // 0-100
  blockchainHash?: string;
  thumbnailColor?: string;
}

export interface VersionEntry {
  version: number;
  changedBy: string;
  changedAt: string;
  note: string;
}

export interface AuditEntry {
  id: string;
  actor: string;
  role: Role;
  action: string;
  target: string;
  timestamp: string;
}

export type CaseStatus = 'OPEN' | 'UNDER_REVIEW' | 'CLOSED';

export interface CaseItem {
  id: string;
  title: string;
  status: CaseStatus;
  assignedOfficer: string;
  documentCount: number;
  createdAt: string;
  updatedAt: string;
  description: string;
}

export interface NotificationItem {
  id: string;
  message: string;
  read: boolean;
  timestamp: string;
  kind: 'info' | 'success' | 'warning' | 'error';
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  sources?: { label: string; docId: string }[];
}

export interface StatCardData {
  label: string;
  value: number | string;
  trend?: string;
  kind: 'default' | 'success' | 'warning' | 'error';
}
