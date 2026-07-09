import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TicketPriority, TicketStatus, type TicketCategory } from '../lib/ticket';

const SKELETON_ROWS = 3;

export type Ticket = {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  studentEmail: string;
  createdAt: string;
};

type TicketsTableProps = {
  tickets: Ticket[] | undefined;
  isPending: boolean;
};

const priorityBadgeVariant: Record<TicketPriority, 'secondary' | 'default' | 'destructive'> = {
  [TicketPriority.low]: 'secondary',
  [TicketPriority.medium]: 'secondary',
  [TicketPriority.high]: 'default',
  [TicketPriority.urgent]: 'destructive',
};

const statusBadgeClassName: Record<TicketStatus, string> = {
  [TicketStatus.open]: 'bg-red-100 text-red-700',
  [TicketStatus.resolved]: 'bg-blue-100 text-blue-700',
  [TicketStatus.closed]: 'bg-gray-200 text-black',
};

function TicketsTable({ tickets, isPending }: TicketsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Subject</TableHead>
          <TableHead>Requester</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Priority</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Created</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isPending
          ? Array.from({ length: SKELETON_ROWS }).map((_, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Skeleton className="h-4 w-48" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-40" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-14" />
                </TableCell>
                <TableCell />
                <TableCell>
                  <Skeleton className="h-4 w-20" />
                </TableCell>
              </TableRow>
            ))
          : (tickets ?? []).map((ticket) => (
              <TableRow key={ticket.id}>
                <TableCell>{ticket.subject}</TableCell>
                <TableCell>{ticket.studentEmail}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className={`capitalize ${statusBadgeClassName[ticket.status]}`}>
                    {ticket.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={priorityBadgeVariant[ticket.priority]} className="capitalize">
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell />
                <TableCell>{new Date(ticket.createdAt).toLocaleDateString()}</TableCell>
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default TicketsTable;
