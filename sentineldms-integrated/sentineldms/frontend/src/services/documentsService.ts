import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import { mockDocuments, mockVersions } from '../mocks/data';
import type { DocumentItem, VersionEntry } from '../types';

export interface DocumentFilters {
  query?: string;
  caseId?: string;
  type?: string;
  status?: string;
}

export async function fetchDocuments(filters: DocumentFilters = {}): Promise<DocumentItem[]> {
  if (USE_MOCKS) {
    let results = [...mockDocuments];
    if (filters.query) {
      const q = filters.query.toLowerCase();
      results = results.filter(
        (d) => d.title.toLowerCase().includes(q) || d.caseId.toLowerCase().includes(q) || d.caseTitle.toLowerCase().includes(q)
      );
    }
    if (filters.caseId) results = results.filter((d) => d.caseId === filters.caseId);
    if (filters.type) results = results.filter((d) => d.type === filters.type);
    if (filters.status) results = results.filter((d) => d.status === filters.status);
    return delay(results, 400);
  }
  const res = await api.get('/documents', { params: filters });
  return res.data;
}

export async function fetchDocumentById(id: string): Promise<DocumentItem | undefined> {
  if (USE_MOCKS) {
    return delay(mockDocuments.find((d) => d.id === id), 300);
  }
  const res = await api.get(`/documents/${id}`);
  return res.data;
}

export async function fetchDocumentVersions(_id: string): Promise<VersionEntry[]> {
  if (USE_MOCKS) {
    return delay(mockVersions, 250);
  }
  const res = await api.get(`/documents/${_id}/versions`);
  return res.data;
}

export async function uploadDocument(
  file: File,
  caseId: string
): Promise<{ id: string; classification: string; confidence: number; ocrText: string }> {
  if (USE_MOCKS) {
    const classifications = ['Witness Statement', 'FIR', 'Forensic Report', 'Chargesheet'];
    const classification = classifications[Math.floor(Math.random() * classifications.length)];
    const ocrSamples: Record<string, string> = {
      'Witness Statement':
        'I, the undersigned, state that on the date in question I was present at the location and observed the following events. The statement given herein is true to the best of my knowledge…',
      FIR: 'First Information Report registered under the relevant section. Complainant states that the incident occurred at approximately the stated time. Officer on duty recorded the following details…',
      'Forensic Report':
        'Sample analysis conducted under standard laboratory protocol. Findings indicate the following results consistent with the submitted evidence. Chain of custody maintained throughout…',
      Chargesheet:
        'Chargesheet filed pursuant to investigation. The accused is charged under the following sections. Evidence gathered includes documentary and forensic material as listed…',
    };
    return delay(
      {
        id: `DOC-${Math.floor(Math.random() * 900 + 100)}`,
        classification,
        confidence: 85 + Math.floor(Math.random() * 13),
        ocrText: ocrSamples[classification],
      },
      1200
    );
  }
  const form = new FormData();
  form.append('file', file);
  form.append('caseId', caseId);
  const res = await api.post('/documents/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function verifyOnBlockchain(_id: string): Promise<{ verified: boolean; hash: string }> {
  if (USE_MOCKS) {
    return delay({ verified: true, hash: `0x${Math.random().toString(16).slice(2, 18)}` }, 900);
  }
  const res = await api.post(`/documents/${_id}/verify`);
  return res.data;
}

export async function signDocument(_id: string): Promise<{ signed: boolean }> {
  if (USE_MOCKS) {
    return delay({ signed: true }, 700);
  }
  const res = await api.post(`/documents/${_id}/sign`);
  return res.data;
}
