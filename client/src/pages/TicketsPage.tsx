import { useQuery } from '@tanstack/react-query';
import TicketsTable, { type Ticket } from '../components/TicketsTable';
import { apiGet } from '../lib/api';

function TicketsPage() {
  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets'],
    queryFn: () => apiGet<{ tickets: Ticket[] }>('/api/tickets').then((data) => data.tickets),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">Tickets</h1>

      {isError && <p className="text-sm text-destructive">Failed to load tickets. Please try again.</p>}

      {(isPending || tickets) && <TicketsTable tickets={tickets} isPending={isPending} />}
    </div>
  );
}

export default TicketsPage;
