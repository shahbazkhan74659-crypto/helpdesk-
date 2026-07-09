import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { apiPost } from '../lib/api';
import type { TicketDetailData } from '../pages/TicketDetailPage';

const replySchema = z.object({
  body: z.string().trim().min(1, 'Reply cannot be empty'),
});

type ReplyFormValues = z.infer<typeof replySchema>;

type ReplyFormProps = {
  ticketId: number;
  onReplySent: (updatedTicket: TicketDetailData) => void;
};

function ReplyForm({ ticketId, onReplySent }: ReplyFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ReplyFormValues>({
    resolver: zodResolver(replySchema),
    defaultValues: { body: '' },
  });

  const mutation = useMutation({
    mutationFn: (body: string) => apiPost<TicketDetailData>(`/api/tickets/${ticketId}/messages`, { body }),
    onSuccess: (updatedTicket) => {
      onReplySent(updatedTicket);
      reset();
    },
  });

  async function onSubmit(values: ReplyFormValues) {
    try {
      await mutation.mutateAsync(values.body);
    } catch {
      // surfaced via mutation.isError below
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-gray-900">Add a Reply</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-2" noValidate>
        <Textarea
          id="reply"
          rows={4}
          placeholder="Type your reply..."
          aria-label="Reply"
          aria-invalid={!!errors.body}
          {...register('body')}
        />
        {errors.body && <p className="text-sm text-destructive">{errors.body.message}</p>}
        {mutation.isError && <p className="text-sm text-destructive">Failed to send reply. Please try again.</p>}
        <Button type="submit" disabled={isSubmitting} className="w-fit">
          {isSubmitting ? 'Sending...' : 'Send Reply'}
        </Button>
      </form>
    </div>
  );
}

export default ReplyForm;
