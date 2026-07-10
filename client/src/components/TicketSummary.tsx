import { useMutation } from '@tanstack/react-query';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { apiPost } from '../lib/api';

type TicketSummaryProps = {
  ticketId: number;
};

function TicketSummary({ ticketId }: TicketSummaryProps) {
  const mutation = useMutation({
    mutationFn: () => apiPost<{ summary: string }>(`/api/tickets/${ticketId}/summarize`, {}),
  });

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        variant="outline"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="w-fit"
      >
        <Sparkles />
        {mutation.isPending ? 'Summarizing...' : mutation.data ? 'Regenerate Summary' : 'Summarize'}
      </Button>
      {mutation.isError && <p className="text-sm text-destructive">Failed to summarize ticket. Please try again.</p>}
      {mutation.data && (
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Summary</p>
            <p className="text-sm whitespace-pre-wrap">{mutation.data.summary}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default TicketSummary;
