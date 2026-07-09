import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import TicketsTable, { type Ticket } from '../components/TicketsTable';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '../lib/api';
import { TicketCategory, TicketPriority, TicketStatus } from '../lib/ticket';

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];
const ALL_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 300;

const statusOptions = Object.values(TicketStatus);
const priorityOptions = Object.values(TicketPriority);
const categoryOptions = Object.values(TicketCategory);

function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [status, setStatus] = useState<string>(ALL_FILTER);
  const [priority, setPriority] = useState<string>(ALL_FILTER);
  const [category, setCategory] = useState<string>(ALL_FILTER);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sort = sorting[0] ?? DEFAULT_SORTING[0];

  const params = new URLSearchParams({ sortBy: sort.id, sortDir: sort.desc ? 'desc' : 'asc' });
  if (status !== ALL_FILTER) params.set('status', status);
  if (priority !== ALL_FILTER) params.set('priority', priority);
  if (category !== ALL_FILTER) params.set('category', category);
  if (search) params.set('search', search);

  const {
    data: tickets,
    isPending,
    isError,
  } = useQuery({
    queryKey: ['tickets', sort.id, sort.desc, status, priority, category, search],
    queryFn: () => apiGet<{ tickets: Ticket[] }>(`/api/tickets?${params}`).then((data) => data.tickets),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-gray-900">Tickets</h1>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search subject or requester email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="max-w-xs"
        />

        <Select value={status} onValueChange={(value) => setStatus(value ?? ALL_FILTER)}>
          <SelectTrigger aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
            {statusOptions.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={priority} onValueChange={(value) => setPriority(value ?? ALL_FILTER)}>
          <SelectTrigger aria-label="Filter by priority">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All priorities</SelectItem>
            {priorityOptions.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={category} onValueChange={(value) => setCategory(value ?? ALL_FILTER)}>
          <SelectTrigger aria-label="Filter by category">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All categories</SelectItem>
            {categoryOptions.map((option) => (
              <SelectItem key={option} value={option} className="capitalize">
                {option.replace(/_/g, ' ')}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isError && <p className="text-sm text-destructive">Failed to load tickets. Please try again.</p>}

      {(isPending || tickets) && (
        <TicketsTable tickets={tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />
      )}
    </div>
  );
}

export default TicketsPage;
