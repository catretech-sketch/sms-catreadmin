import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  inviteTeamMember, updateTeamMember, addTeamDocument, deleteTeamDocument, getTeamDocument, downloadDataUrl,
} from '../team';
import type { InviteTeamBody, UpdateTeamBody } from '../team';
import type { TeamDocumentInput } from '../types';
import { qk } from '../queryKeys';

export function useInviteTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: InviteTeamBody) => inviteTeamMember(body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.team.list() }); },
  });
}

export function useUpdateTeamMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateTeamBody }) => updateTeamMember(id, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.team.list() }); },
  });
}

export function useAddTeamDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, body }: { memberId: string; body: TeamDocumentInput }) =>
      addTeamDocument(memberId, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.team.list() }); },
  });
}

export function useDeleteTeamDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, docId }: { memberId: string; docId: string }) =>
      deleteTeamDocument(memberId, docId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: qk.team.list() }); },
  });
}

export async function downloadTeamDocument(memberId: string, docId: string, fileName: string): Promise<void> {
  const doc = await getTeamDocument(memberId, docId);
  downloadDataUrl(fileName || doc.file_name, doc.content);
}
