import { useQuery } from '@tanstack/react-query';
import { fetchAuditLog, fetchAuditForDocument } from '../services/auditService';

export function useAuditLog() {
  return useQuery({ queryKey: ['audit'], queryFn: fetchAuditLog });
}

export function useDocumentAuditTrail(docId: string | undefined) {
  return useQuery({
    queryKey: ['audit-document', docId],
    queryFn: () => fetchAuditForDocument(docId as string),
    enabled: Boolean(docId),
  });
}
