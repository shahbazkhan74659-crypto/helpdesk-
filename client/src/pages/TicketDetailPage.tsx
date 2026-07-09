import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import BackLink from '../components/BackLink';
import ReplyForm from '../components/ReplyForm';
import ReplyThread from '../components/ReplyThread';
import TicketDetail from '../components/TicketDetail';
import { priorityBadgeVariant } from '../components/TicketsTable';
import UpdateTicket from '../components/UpdateTicket';
import { apiGet, ApiError } from '../lib/api';
import { type MessageSender, type TicketCategory, type TicketStatus, type TicketPriority } from '../lib/ticket';

export type TicketMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  sentAt: string;
};

export type Agent = {
  id: string;
  name: string;
  email: string;
};

export type TicketDetailData = {
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
    queryFn: () => apiGet<TicketDetailData>(`/api/tickets/${id}`),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink to="/tickets" label="Back to tickets" />
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-96" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-40 w-full" />
          </div>
          <div className="flex flex-col gap-4">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-4">
        <BackLink to="/tickets" label="Back to tickets" />
        <p className="text-sm text-destructive">
          {notFound ? 'Ticket not found.' : 'Failed to load ticket. Please try again.'}
        </p>
      </div>
    );
  }

  const [originalMessage, ...replies] = ticket.messages;

  return (
    <div className="flex flex-col gap-4">
      <BackLink to="/tickets" label="Back to tickets" />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[1fr_260px]">
        <div className="flex flex-col gap-4">
          <TicketDetail
            subject={ticket.subject}
            studentEmail={ticket.studentEmail}
            createdAt={ticket.createdAt}
            updatedAt={ticket.updatedAt}
            message={originalMessage?.body ?? null}
          />

          <Badge variant={priorityBadgeVariant[ticket.priority]} className="w-fit capitalize">
            {ticket.priority}
          </Badge>

          <ReplyThread replies={replies} />

          <ReplyForm
            ticketId={ticket.id}
            onReplySent={(updatedTicket) => queryClient.setQueryData(['ticket', id], updatedTicket)}
          />
        </div>

        <UpdateTicket
          ticketId={ticket.id}
          status={ticket.status}
          category={ticket.category}
          assignedAgent={ticket.assignedAgent}
          onUpdate={(updatedTicket) => queryClient.setQueryData(['ticket', id], updatedTicket)}
        />
      </div>
    </div>
  );
}

export default TicketDetailPage;
