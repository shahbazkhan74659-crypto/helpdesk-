import { useQuery } from '@tanstack/react-query';
import { Inbox, Percent, Sparkles, Ticket, Timer, UserCheck } from 'lucide-react';
import StatTile from '../components/StatTile';
import TicketsPerDayChart, { type DailyTicketCount } from '../components/TicketsPerDayChart';
import { apiGet } from '../lib/api';
import { formatDuration } from '../lib/duration';

type TicketStats = {
  totalTickets: number;
  openTickets: number;
  resolvedCount: number;
  aiResolvedCount: number;
  agentResolvedCount: number;
  aiResolvedPercent: number | null;
  agentResolvedPercent: number | null;
  avgResolutionSeconds: number | null;
};

type DailyTicketStats = {
  days: DailyTicketCount[];
};

function HomePage() {
  const { data, isPending, isError } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: () => apiGet<TicketStats>('/api/tickets/stats'),
  });

  const {
    data: dailyData,
    isPending: isDailyPending,
    isError: isDailyError,
  } = useQuery({
    queryKey: ['ticket-stats-daily'],
    queryFn: () => apiGet<DailyTicketStats>('/api/tickets/stats/daily'),
  });

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-foreground">Home</h1>

      {isError && <p className="text-sm text-destructive">Failed to load dashboard stats. Please try again.</p>}

      {(isPending || data) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatTile label="Total Tickets" icon={Ticket} isPending={isPending} value={data && String(data.totalTickets)} />
          <StatTile label="Open Tickets" icon={Inbox} isPending={isPending} value={data && String(data.openTickets)} />
          <StatTile
            label="Resolved by AI"
            icon={Sparkles}
            isPending={isPending}
            value={data && String(data.aiResolvedCount)}
          />
          <StatTile
            label="Resolved by Agents"
            icon={UserCheck}
            isPending={isPending}
            value={data && String(data.agentResolvedCount)}
          />
          <StatTile
            label="AI vs Agent Resolutions"
            icon={Percent}
            isPending={isPending}
            value={
              data &&
              (data.aiResolvedPercent === null ? 'N/A' : `${data.aiResolvedPercent}% AI / ${data.agentResolvedPercent}% Agent`)
            }
          />
          <StatTile
            label="Avg Resolution Time"
            icon={Timer}
            isPending={isPending}
            value={data && (data.avgResolutionSeconds === null ? 'N/A' : formatDuration(data.avgResolutionSeconds))}
          />
        </div>
      )}

      {isDailyError && <p className="text-sm text-destructive">Failed to load ticket volume. Please try again.</p>}

      {(isDailyPending || dailyData) && <TicketsPerDayChart days={dailyData?.days} isPending={isDailyPending} />}
    </div>
  );
}

export default HomePage;
