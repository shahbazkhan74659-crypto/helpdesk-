import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { priorityBadgeVariant, statusBadgeClassName } from '../components/TicketsTable';
import { apiGet, apiPatch, ApiError } from '../lib/api';
import { MessageSender, type TicketCategory, type TicketPriority, type TicketStatus } from '../lib/ticket';

const UNASSIGNED = 'unassigned';

type TicketMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  sentAt: string;
};

type Agent = {
  id: string;
  name: string;
  email: string;
};

type TicketDetail = {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  studentEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent: Agent | null;
  messages: TicketMessage[];
};

const senderLabel: Record<MessageSender, string> = {
  [MessageSender.student]: 'Student',
  [MessageSender.agent]: 'Agent',
  [MessageSender.ai]: 'AI',
};

function BackLink() {
  return (
    <Link to="/tickets" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
      <ArrowLeft className="size-4" />
      Back to tickets
    </Link>
  );
}

function TicketDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();

  const {
    data: ticket,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiGet<TicketDetail>(`/api/tickets/${id}`),
  });

  const { data: agents } = useQuery({
    queryKey: ['agents'],
    queryFn: () => apiGet<{ agents: Agent[] }>('/api/users/agents').then((data) => data.agents),
  });

  const assignMutation = useMutation({
    mutationFn: (assignedAgentId: string | null) =>
      apiPatch<TicketDetail>(`/api/tickets/${id}/assign`, { assignedAgentId }),
    onSuccess: (updatedTicket) => {
      queryClient.setQueryData(['ticket', id], updatedTicket);
    },
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-1 flex-col gap-2">
            <Skeleton className="h-7 w-96" />
            <Skeleton className="h-4 w-64" />
          </div>
          <div className="flex w-40 shrink-0 flex-col gap-2">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <p className="text-sm text-destructive">
          {notFound ? 'Ticket not found.' : 'Failed to load ticket. Please try again.'}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <BackLink />

      <div className="flex items-start justify-between gap-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
          <p className="text-sm text-muted-foreground">
            {ticket.studentEmail} · opened {new Date(ticket.createdAt).toLocaleString()}
          </p>
        </div>

        <div className="flex w-48 shrink-0 flex-col gap-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900">Assigned:</span>
            <Select
              value={ticket.assignedAgent?.id ?? UNASSIGNED}
              onValueChange={(value) => assignMutation.mutate(!value || value === UNASSIGNED ? null : value)}
            >
              <SelectTrigger size="sm" aria-label="Assigned agent" disabled={assignMutation.isPending}>
                <SelectValue>{() => ticket.assignedAgent?.name ?? 'Unassigned'}</SelectValue>
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
          </div>
          {assignMutation.isError && <p className="text-xs text-destructive">Failed to assign. Please try again.</p>}
          <p>
            <span className="font-medium text-gray-900">Updated at:</span>{' '}
            <span className="text-muted-foreground">{new Date(ticket.updatedAt).toLocaleString()}</span>
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className={`capitalize ${statusBadgeClassName[ticket.status]}`}>
          {ticket.status}
        </Badge>
        <Badge variant={priorityBadgeVariant[ticket.priority]} className="capitalize">
          {ticket.priority}
        </Badge>
        {ticket.category && (
          <Badge variant="outline" className="capitalize">
            {ticket.category.replace(/_/g, ' ')}
          </Badge>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {ticket.messages.length === 0 && <p className="text-sm text-muted-foreground">No messages yet.</p>}
          {ticket.messages.map((message) => (
            <div key={message.id} className="rounded-lg border p-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span className="font-medium">{senderLabel[message.sender]}</span>
                <span>{new Date(message.sentAt).toLocaleString()}</span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{message.body}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

export default TicketDetailPage;
