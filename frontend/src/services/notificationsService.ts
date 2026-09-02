import { api } from './axiosInstance';
import { delay, USE_MOCKS } from './delay';
import { mockNotifications } from '../mocks/data';
import type { NotificationItem } from '../types';

export async function fetchNotifications(): Promise<NotificationItem[]> {
  if (USE_MOCKS) return delay([...mockNotifications], 300);
  const res = await api.get('/notifications');
  return res.data;
}

export async function markAsRead(id: string): Promise<void> {
  if (USE_MOCKS) {
    const n = mockNotifications.find((n) => n.id === id);
    if (n) n.read = true;
    return delay(undefined, 150);
  }
  await api.post(`/notifications/${id}/read`);
}
