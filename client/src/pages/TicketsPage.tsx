import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { SortingState } from '@tanstack/react-table';
import TicketsTable, { type Ticket } from '../components/TicketsTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { apiGet } from '../lib/api';
import { TicketCategory, TicketPriority, TicketStatus } from '../lib/ticket';

const DEFAULT_SORTING: SortingState = [{ id: 'createdAt', desc: true }];
const ALL_FILTER = 'all';
const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 10;

const statusOptions = Object.values(TicketStatus);
const priorityOptions = Object.values(TicketPriority);
const categoryOptions = Object.values(TicketCategory);

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function titleCase(text: string): string {
  return text.split(' ').map(capitalize).join(' ');
}

function formatFilterValue(value: string | null): string {
  if (!value || value === ALL_FILTER) return 'All';
  return titleCase(value.replace(/_/g, ' '));
}

function TicketsPage() {
  const [sorting, setSorting] = useState<SortingState>(DEFAULT_SORTING);
  const [status, setStatus] = useState<string>(ALL_FILTER);
  const [priority, setPriority] = useState<string>(ALL_FILTER);
  const [category, setCategory] = useState<string>(ALL_FILTER);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timeout = setTimeout(() => setSearch(searchInput.trim()), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  const sort = sorting[0] ?? DEFAULT_SORTING[0];

  // Reset to page 1 whenever the sort/filter criteria change, using the
  // "adjust state during render" pattern instead of an effect so the reset
  // is applied before this render commits rather than after, in an extra pass.
  const filterKey = `${sort.id}|${sort.desc}|${status}|${priority}|${category}|${search}`;
  const [prevFilterKey, setPrevFilterKey] = useState(filterKey);
  if (filterKey !== prevFilterKey) {
    setPrevFilterKey(filterKey);
    setPage(1);
  }

  const params = new URLSearchParams({
    sortBy: sort.id,
    sortDir: sort.desc ? 'desc' : 'asc',
    page: String(page),
    pageSize: String(PAGE_SIZE),
  });
  if (status !== ALL_FILTER) params.set('status', status);
  if (priority !== ALL_FILTER) params.set('priority', priority);
  if (category !== ALL_FILTER) params.set('category', category);
  if (search) params.set('search', search);

  const { data, isPending, isError } = useQuery({
    queryKey: ['tickets', sort.id, sort.desc, status, priority, category, search, page],
    queryFn: () => apiGet<{ tickets: Ticket[]; total: number }>(`/api/tickets?${params}`),
  });

  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            <SelectValue>{(value: string | null) => `Status: ${formatFilterValue(value)}`}</SelectValue>
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
            <SelectValue>{(value: string | null) => `Priority: ${formatFilterValue(value)}`}</SelectValue>
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
            <SelectValue>{(value: string | null) => `Category: ${formatFilterValue(value)}`}</SelectValue>
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

      {(isPending || data) && (
        <>
          <TicketsTable tickets={data?.tickets} isPending={isPending} sorting={sorting} onSortingChange={setSorting} />

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {total === 0
                ? 'No tickets'
                : `Showing ${(page - 1) * PAGE_SIZE + 1}-${Math.min(page * PAGE_SIZE, total)} of ${total}`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <span>
                Page {page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPage((current) => current + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default TicketsPage;
