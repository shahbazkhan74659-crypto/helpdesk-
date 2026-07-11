import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  type OnChangeFn,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
};

export const priorityBadgeVariant: Record<TicketPriority, 'secondary' | 'default' | 'destructive'> = {
  [TicketPriority.low]: 'secondary',
  [TicketPriority.medium]: 'secondary',
  [TicketPriority.high]: 'default',
  [TicketPriority.urgent]: 'destructive',
};

export const statusBadgeClassName: Record<TicketStatus, string> = {
  [TicketStatus.open]: 'border-primary/40 bg-primary/10 text-primary',
  [TicketStatus.resolved]: 'border-success/40 bg-success/10 text-success',
  [TicketStatus.closed]: 'border-muted-foreground/30 bg-transparent text-muted-foreground',
};

const columnHelper = createColumnHelper<Ticket>();

// Column ids must match the server's whitelisted sort fields (server/src/routes/tickets.ts)
// since they're sent back as the `sortBy` query param.
const columns = [
  columnHelper.accessor('subject', {
    header: 'Subject',
    cell: (info) => (
      <Link to={`/tickets/${info.row.original.id}`} className="font-medium text-primary hover:underline">
        {info.getValue()}
      </Link>
    ),
  }),
  columnHelper.accessor('studentEmail', { header: 'Requester' }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => (
      <Badge variant="outline" className={`font-mono uppercase tracking-wide ${statusBadgeClassName[info.getValue()]}`}>
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('priority', {
    header: 'Priority',
    cell: (info) => (
      <Badge variant={priorityBadgeVariant[info.getValue()]} className="capitalize">
        {info.getValue()}
      </Badge>
    ),
  }),
  columnHelper.accessor('category', {
    header: 'Category',
    cell: (info) => {
      const category = info.getValue();
      if (!category) return null;
      return (
        <Badge variant="outline" className="capitalize">
          {category.replace(/_/g, ' ')}
        </Badge>
      );
    },
  }),
  columnHelper.accessor('createdAt', {
    header: 'Created',
    cell: (info) => new Date(info.getValue()).toLocaleDateString(),
  }),
];

function TicketsTable({ tickets, isPending, sorting, onSortingChange }: TicketsTableProps) {
  const table = useReactTable({
    data: tickets ?? [],
    columns,
    state: { sorting },
    onSortingChange,
    manualSorting: true,
    enableMultiSort: false,
    enableSortingRemoval: false,
    sortDescFirst: false,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => {
              const sortDirection = header.column.getIsSorted();
              return (
                <TableHead key={header.id}>
                  <button
                    type="button"
                    className="flex items-center gap-1 font-medium"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {sortDirection === 'asc' && <ChevronUp className="size-3.5" />}
                    {sortDirection === 'desc' && <ChevronDown className="size-3.5" />}
                    {!sortDirection && <ChevronsUpDown className="size-3.5 text-muted-foreground" />}
                  </button>
                </TableHead>
              );
            })}
          </TableRow>
        ))}
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
          : table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
      </TableBody>
    </Table>
  );
}

export default TicketsTable;
