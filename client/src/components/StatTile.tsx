import type { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

type StatTileProps = {
  label: string;
  value: string | undefined;
  icon: LucideIcon;
  isPending: boolean;
};

function StatTile({ label, value, icon: Icon, isPending }: StatTileProps) {
  return (
    <Card className="border-transparent bg-sidebar text-sidebar-foreground ring-sidebar-border">
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent">
          <Icon className="size-5 text-sidebar-primary" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium tracking-wide text-sidebar-foreground/70 uppercase">{label}</p>
          {isPending ? (
            <Skeleton className="h-7 w-16 bg-sidebar-accent" />
          ) : (
            <p className="font-mono text-2xl font-semibold tabular-nums text-sidebar-primary">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatTile;
