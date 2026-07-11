import { Card, CardContent } from '@/components/ui/card';
import { MessageSender } from '../lib/ticket';
import type { TicketMessage } from '../pages/TicketDetailPage';

const senderLabel: Record<MessageSender, string> = {
  [MessageSender.student]: 'Student',
  [MessageSender.agent]: 'Agent',
  [MessageSender.admin]: 'Admin',
  [MessageSender.ai]: 'AI',
};

type ReplyThreadProps = {
  replies: TicketMessage[];
};

function ReplyThread({ replies }: ReplyThreadProps) {
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-base font-semibold text-foreground">Replies</h2>
      {replies.length === 0 && <p className="text-sm text-muted-foreground">No replies yet.</p>}
      {replies.map((message) => (
        <Card key={message.id}>
          <CardContent className="flex flex-col gap-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">{senderLabel[message.sender]}</span>
              <span>· {new Date(message.sentAt).toLocaleString()}</span>
            </div>
            <p className="text-sm whitespace-pre-wrap">{message.body}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export default ReplyThread;
