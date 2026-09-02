import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import type { ChatMessage } from '../types';

export async function sendAssistantMessage(text: string): Promise<ChatMessage> {
  if (USE_MOCKS) {
    return delay(
      {
        id: `m-${Date.now()}`,
        role: 'assistant',
        text: `Here's what I found related to "${text}". Once Deepak's endpoint is live this will return a grounded answer with citations.`,
        sources: [
          { label: 'DOC-006 — Witness Statement', docId: 'DOC-006' },
          { label: 'CASE-2026-004', docId: 'DOC-014' },
        ],
      },
      700
    );
  }
  const res = await api.post('/assistant/query', { text });
  return res.data;
}
