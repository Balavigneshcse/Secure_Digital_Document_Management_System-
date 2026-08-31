import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as documentsService from '../services/documentsService';
import type { DocumentFilters } from '../services/documentsService';

export function useDocuments(filters: DocumentFilters) {
  return useQuery({
    queryKey: ['documents', filters],
    queryFn: () => documentsService.fetchDocuments(filters),
  });
}

export function useDocument(id: string | undefined) {
  return useQuery({
    queryKey: ['document', id],
    queryFn: () => documentsService.fetchDocumentById(id as string),
    enabled: Boolean(id),
  });
}

export function useDocumentVersions(id: string | undefined) {
  return useQuery({
    queryKey: ['document-versions', id],
    queryFn: () => documentsService.fetchDocumentVersions(id as string),
    enabled: Boolean(id),
  });
}

export function useUploadDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, caseId }: { file: File; caseId: string }) => documentsService.uploadDocument(file, caseId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}

export function useVerifyOnBlockchain() {
  return useMutation({
    mutationFn: (id: string) => documentsService.verifyOnBlockchain(id),
  });
}

export function useSignDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => documentsService.signDocument(id),
    onSuccess: (_data, id) => qc.invalidateQueries({ queryKey: ['document', id] }),
  });
}
