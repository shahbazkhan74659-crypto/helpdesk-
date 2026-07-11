import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import TicketSummary from './TicketSummary';

type TicketDetailProps = {
  ticketId: number;
  subject: string;
  studentEmail: string;
  createdAt: string;
  updatedAt: string;
  message: string | null;
};

function TicketDetail({ ticketId, subject, studentEmail, createdAt, updatedAt, message }: TicketDetailProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{subject}</h1>
        <p className="text-sm text-muted-foreground">Created: {new Date(createdAt).toLocaleString()}</p>
        <p className="text-sm text-muted-foreground">Updated: {new Date(updatedAt).toLocaleString()}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Message</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {message ? (
            <>
              <p className="text-sm text-muted-foreground">From {studentEmail}</p>
              <p className="text-sm whitespace-pre-wrap">{message}</p>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No message yet.</p>
          )}
        </CardContent>
      </Card>

      <TicketSummary ticketId={ticketId} />
    </div>
  );
}

export default TicketDetail;
