import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MessageSender } from '../lib/ticket';
import ReplyThread from './ReplyThread';

const REPLIES = [
  { id: 'm1', sender: MessageSender.agent, body: 'Please try again.', sentAt: '2026-07-10T09:05:00.000Z' },
  { id: 'm2', sender: MessageSender.student, body: 'It worked, thanks!', sentAt: '2026-07-10T09:10:00.000Z' },
];

describe('ReplyThread', () => {
  it('renders the Replies heading and each reply with its sender label and body', () => {
    render(<ReplyThread replies={REPLIES} />);

    expect(screen.getByRole('heading', { name: 'Replies' })).toBeInTheDocument();
    expect(screen.getByText('Agent')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
    expect(screen.getByText('Student')).toBeInTheDocument();
    expect(screen.getByText('It worked, thanks!')).toBeInTheDocument();
  });

  it('renders replies in the order given', () => {
    render(<ReplyThread replies={REPLIES} />);

    const bodies = screen.getAllByText(/Please try again\.|It worked, thanks!/).map((el) => el.textContent);
    expect(bodies).toEqual(['Please try again.', 'It worked, thanks!']);
  });

  it('shows a fallback message and no cards when there are no replies', () => {
    render(<ReplyThread replies={[]} />);

    expect(screen.getByText('No replies yet.')).toBeInTheDocument();
    expect(screen.queryByText('Agent')).not.toBeInTheDocument();
  });

  it('shows the AI sender label for ai-authored replies', () => {
    render(
      <ReplyThread
        replies={[
          { id: 'm3', sender: MessageSender.ai, body: 'Auto-generated reply.', sentAt: '2026-07-10T09:15:00.000Z' },
        ]}
      />,
    );

    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.getByText('Auto-generated reply.')).toBeInTheDocument();
  });

  it('shows the Admin sender label for admin-authored replies', () => {
    render(
      <ReplyThread
        replies={[
          { id: 'm4', sender: MessageSender.admin, body: 'Approved the refund.', sentAt: '2026-07-10T09:20:00.000Z' },
        ]}
      />,
    );

    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Approved the refund.')).toBeInTheDocument();
  });
});
