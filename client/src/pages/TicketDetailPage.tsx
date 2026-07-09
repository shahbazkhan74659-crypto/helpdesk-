import { useQuery } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { priorityBadgeVariant, statusBadgeClassName } from '../components/TicketsTable';
import { ApiError, apiGet } from '../lib/api';
import { MessageSender, type TicketCategory, type TicketPriority, type TicketStatus } from '../lib/ticket';

type TicketMessage = {
  id: string;
  sender: MessageSender;
  body: string;
  sentAt: string;
};

type TicketDetail = {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  studentEmail: string;
  createdAt: string;
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

  const {
    data: ticket,
    isPending,
    isError,
    error,
  } = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => apiGet<TicketDetail>(`/api/tickets/${id}`),
  });

  if (isPending) {
    return (
      <div className="flex flex-col gap-4">
        <BackLink />
        <Skeleton className="h-7 w-96" />
        <Skeleton className="h-4 w-64" />
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

      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-gray-900">{ticket.subject}</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.studentEmail} · opened {new Date(ticket.createdAt).toLocaleString()}
        </p>
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
