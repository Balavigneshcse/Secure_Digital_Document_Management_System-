import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import { mockAuditLog } from '../mocks/data';
import type { AuditEntry } from '../types';

export async function fetchAuditLog(): Promise<AuditEntry[]> {
  if (USE_MOCKS) return delay([...mockAuditLog], 400);
  const res = await api.get('/audit');
  return res.data;
}

export async function fetchAuditForDocument(docId: string): Promise<AuditEntry[]> {
  if (USE_MOCKS) return delay(mockAuditLog.filter((a) => a.target === docId), 300);
  const res = await api.get(`/audit`, { params: { target: docId } });
  return res.data;
}
