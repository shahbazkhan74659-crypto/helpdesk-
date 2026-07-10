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
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          {isPending ? <Skeleton className="h-7 w-16" /> : <p className="text-2xl font-semibold text-gray-900">{value}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default StatTile;
