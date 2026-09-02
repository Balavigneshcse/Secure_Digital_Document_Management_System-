import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import { mockCases, mockDocuments } from '../mocks/data';
import type { CaseItem, CaseStatus, DocumentItem } from '../types';

export async function fetchCases(): Promise<CaseItem[]> {
  if (USE_MOCKS) return delay([...mockCases], 400);
  const res = await api.get('/cases');
  return res.data;
}

export async function fetchCaseById(id: string): Promise<CaseItem | undefined> {
  if (USE_MOCKS) return delay(mockCases.find((c) => c.id === id), 300);
  const res = await api.get(`/cases/${id}`);
  return res.data;
}

export async function fetchCaseDocuments(caseId: string): Promise<DocumentItem[]> {
  if (USE_MOCKS) return delay(mockDocuments.filter((d) => d.caseId === caseId), 300);
  const res = await api.get(`/cases/${caseId}/documents`);
  return res.data;
}

export async function createCase(payload: { title: string; description: string; assignedOfficer: string }): Promise<CaseItem> {
  if (USE_MOCKS) {
    const newCase: CaseItem = {
      id: `CASE-2026-${(mockCases.length + 1).toString().padStart(3, '0')}`,
      title: payload.title,
      description: payload.description,
      assignedOfficer: payload.assignedOfficer,
      status: 'OPEN',
      documentCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    mockCases.unshift(newCase);
    return delay(newCase, 500);
  }
  const res = await api.post('/cases', payload);
  return res.data;
}

export async function updateCaseStatus(id: string, status: CaseStatus): Promise<void> {
  if (USE_MOCKS) {
    const c = mockCases.find((c) => c.id === id);
    if (c) c.status = status;
    return delay(undefined, 300);
  }
  await api.patch(`/cases/${id}`, { status });
}
