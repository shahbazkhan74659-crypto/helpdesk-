import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type DailyTicketCount = {
  date: string;
  count: number;
};

type TicketsPerDayChartProps = {
  days: DailyTicketCount[] | undefined;
  isPending: boolean;
};

const CHART_HEIGHT = 160;

function formatDayLabel(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function niceMax(max: number): number {
  if (max <= 0) return 1;
  const magnitude = 10 ** Math.floor(Math.log10(max));
  return Math.ceil(max / magnitude) * magnitude;
}

function TicketsPerDayChart({ days, isPending }: TicketsPerDayChartProps) {
  const maxCount = days && days.length > 0 ? Math.max(...days.map((d) => d.count)) : 0;
  const axisMax = niceMax(maxCount);
  const gridValues = [axisMax, Math.round(axisMax / 2), 0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tickets per day</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending || !days ? (
          <Skeleton className="h-[192px] w-full" />
        ) : (
          <div className="flex flex-col gap-2">
            <div className="relative flex" style={{ height: CHART_HEIGHT }}>
              <div className="flex w-10 shrink-0 flex-col justify-between pr-2 text-right text-xs text-muted-foreground">
                {gridValues.map((value) => (
                  <span key={value}>{value}</span>
                ))}
              </div>
              <div className="relative flex-1">
                {gridValues.map((value) => (
                  <div
                    key={value}
                    className="absolute inset-x-0 border-t border-border"
                    style={{ top: axisMax === 0 ? '100%' : `${100 - (value / axisMax) * 100}%` }}
                  />
                ))}
                <div className="absolute inset-0 flex items-end gap-[3px]">
                  {days.map((day, index) => {
                    const heightPercent = axisMax === 0 ? 0 : (day.count / axisMax) * 100;
                    // Centering the tooltip on the bar overflows the card's
                    // clipped edge for the first/last couple of bars - anchor
                    // those to the slot's own edge instead so they stay in view.
                    const isNearStart = index < 2;
                    const isNearEnd = index >= days.length - 2;
                    const tooltipPositionClass = isNearStart
                      ? 'left-0'
                      : isNearEnd
                        ? 'right-0'
                        : 'left-1/2 -translate-x-1/2';
                    return (
                      <div
                        key={day.date}
                        className="group relative flex h-full flex-1 items-end justify-center"
                        tabIndex={0}
                        role="img"
                        aria-label={`${formatDayLabel(day.date)}: ${day.count} ${day.count === 1 ? 'ticket' : 'tickets'}`}
                      >
                        <div
                          className="w-full max-w-5 rounded-t-[4px] bg-primary opacity-90 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                          style={{ height: `${heightPercent}%`, minHeight: 2 }}
                        />
                        <div
                          className={`pointer-events-none absolute bottom-full z-10 mb-1.5 rounded-md bg-popover px-2 py-1 text-xs whitespace-nowrap text-popover-foreground opacity-0 shadow-md ring-1 ring-border transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${tooltipPositionClass}`}
                        >
                          <span className="font-medium">{day.count}</span> on {formatDayLabel(day.date)}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <div className="ml-10 flex text-xs text-muted-foreground">
              {days.map((day, index) => (
                <div key={day.date} className="flex-1 text-center">
                  {index % 5 === 0 ? formatDayLabel(day.date) : ''}
                </div>
              ))}
            </div>
            <table className="sr-only">
              <caption>Tickets created per day, last {days.length} days</caption>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Tickets</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day.date}>
                    <td>{formatDayLabel(day.date)}</td>
                    <td>{day.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default TicketsPerDayChart;
