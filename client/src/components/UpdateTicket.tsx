import { useMutation, useQuery } from '@tanstack/react-query';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet, apiPatch } from '../lib/api';
import type { Agent, TicketDetailData } from '../pages/TicketDetailPage';
import { TicketCategory, TicketStatus } from '../lib/ticket';

const UNASSIGNED = 'unassigned';
const NO_CATEGORY = 'none';
const statusOptions = Object.values(TicketStatus);
const categoryOptions = Object.values(TicketCategory);

type UpdateTicketProps = {
  ticketId: number;
  status: TicketStatus;
  category: TicketCategory | null;
  assignedAgent: Agent | null;
  onUpdate: (updatedTicket: TicketDetailData) => void;
};

function UpdateTicket({ ticketId, status, category, assignedAgent, onUpdate }: UpdateTicketProps) {
  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiGet<{ agents: Agent[] }>('/api/users/agents').then((data) => data.agents),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedAgentId: string | null) =>
      apiPatch<TicketDetailData>(`/api/tickets/${ticketId}/assign`, { assignedAgentId }),
    onSuccess: onUpdate,
  });

  const statusMutation = useMutation({
    mutationFn: (nextStatus: TicketStatus) =>
      apiPatch<TicketDetailData>(`/api/tickets/${ticketId}/status`, { status: nextStatus }),
    onSuccess: onUpdate,
  });

  const categoryMutation = useMutation({
    mutationFn: (nextCategory: TicketCategory | null) =>
      apiPatch<TicketDetailData>(`/api/tickets/${ticketId}/category`, { category: nextCategory }),
    onSuccess: onUpdate,
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-900">Assigned</span>
        <Select
          value={assignedAgent?.id ?? UNASSIGNED}
          onValueChange={(value) => assignMutation.mutate(!value || value === UNASSIGNED ? null : value)}
        >
          <SelectTrigger size="sm" aria-label="Assigned agent" disabled={assignMutation.isPending} className="w-full">
            <SelectValue>{() => assignedAgent?.name ?? 'Unassigned'}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
            {agents?.map((agent) => (
              <SelectItem key={agent.id} value={agent.id}>
                {agent.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {assignMutation.isError && <p className="text-xs text-destructive">Failed to assign. Please try again.</p>}
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-900">Status</span>
        <Select value={status} onValueChange={(value) => value && statusMutation.mutate(value as TicketStatus)}>
          <SelectTrigger size="sm" aria-label="Ticket status" disabled={statusMutation.isPending} className="w-full">
            <SelectValue>{() => <span className="capitalize">{status}</span>}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1 text-sm">
        <span className="font-medium text-gray-900">Category</span>
        <Select
          value={category ?? NO_CATEGORY}
          onValueChange={(value) =>
            categoryMutation.mutate(!value || value === NO_CATEGORY ? null : (value as TicketCategory))
          }
        >
          <SelectTrigger size="sm" aria-label="Ticket category" disabled={categoryMutation.isPending} className="w-full">
            <SelectValue>
              {() => (
                <span className="capitalize">{category ? category.replace(/_/g, ' ') : 'No category'}</span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_CATEGORY}>No category</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(statusMutation.isError || categoryMutation.isError) && (
        <p className="text-sm text-destructive">Failed to update ticket. Please try again.</p>
      )}
    </div>
  );
}

export default UpdateTicket;
