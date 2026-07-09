import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import TicketsTable, { type Ticket } from '../components/TicketsTable';
import { apiGet } from '../lib/api';

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];

function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const sort = sorting[0] ?? DEFAULT_SORTING[0];

  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets', sort.id, sort.desc],
    queryFn: () =>
      apiGet<{ tickets: Ticket[] }>(
        `/api/tickets?${new URLSearchParams({ sortBy: sort.id, sortDir: sort.desc ? 'desc' : 'asc' })}`,
      ).then((data) => data.tickets),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">Tickets</h1>

      {isError && <p className="text-sm text-destructive">Failed to load tickets. Please try again.</p>}

      {(isPending || tickets) && (
        <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  );
}

export default TicketsPage;
