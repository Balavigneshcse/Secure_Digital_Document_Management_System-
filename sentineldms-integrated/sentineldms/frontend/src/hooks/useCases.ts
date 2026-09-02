import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as casesService from '../services/casesService';
import type { CaseStatus } from '../types';

export function useCases() {
  return useQuery({ queryKey: ['cases'], queryFn: casesService.fetchCases });
}

export function useCase(id: string | undefined) {
  return useQuery({
    queryKey: ['case', id],
    queryFn: () => casesService.fetchCaseById(id as string),
    enabled: Boolean(id),
  });
}

export function useCaseDocuments(caseId: string | undefined) {
  return useQuery({
    queryKey: ['case-documents', caseId],
    queryFn: () => casesService.fetchCaseDocuments(caseId as string),
    enabled: Boolean(caseId),
  });
}

export function useCreateCase() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: casesService.createCase,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}

export function useUpdateCaseStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: CaseStatus }) => casesService.updateCaseStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['cases'] }),
  });
}
