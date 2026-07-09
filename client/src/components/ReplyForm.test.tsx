import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../lib/api';
import { renderWithQuery } from '../test/renderWithQuery';
import ReplyForm from './ReplyForm';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiPost: vi.fn() };
});

const mockedApiPost = vi.mocked(apiPost);

function renderReplyForm(onReplySent = vi.fn()) {
  renderWithQuery(<ReplyForm ticketId={42} onReplySent={onReplySent} />);
  return { onReplySent };
}

describe('ReplyForm', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
  });

  it('renders the heading, an empty reply textarea, and a submit button', () => {
    renderReplyForm();

    expect(screen.getByRole('heading', { name: 'Add a Reply' })).toBeInTheDocument();
    expect(screen.getByLabelText('Reply')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Send Reply' })).toBeInTheDocument();
  });

  it('shows a validation error and does not submit when the reply is empty', async () => {
    const user = userEvent.setup();
    const { onReplySent } = renderReplyForm();

    await user.click(screen.getByRole('button', { name: 'Send Reply' }));

    expect(await screen.findByText('Reply cannot be empty')).toBeInTheDocument();
    expect(mockedApiPost).not.toHaveBeenCalled();
    expect(onReplySent).not.toHaveBeenCalled();
  });

  it('posts the reply body to the ticket messages endpoint and notifies the parent on success', async () => {
    const updatedTicket = { id: 42, subject: 'Printer jammed again', messages: [] };
    mockedApiPost.mockResolvedValue(updatedTicket);
    const user = userEvent.setup();
    const { onReplySent } = renderReplyForm();

    const textarea = screen.getByLabelText('Reply');
    await user.type(textarea, 'Try restarting the printer.');
    await user.click(screen.getByRole('button', { name: 'Send Reply' }));

    expect(mockedApiPost).toHaveBeenCalledWith('/api/tickets/42/messages', {
      body: 'Try restarting the printer.',
    });
    await waitFor(() => expect(onReplySent).toHaveBeenCalledWith(updatedTicket));
    expect(textarea).toHaveValue('');
  });

  it('shows an error message and does not notify the parent when the request fails', async () => {
    mockedApiPost.mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    const { onReplySent } = renderReplyForm();

    await user.type(screen.getByLabelText('Reply'), 'Try restarting the printer.');
    await user.click(screen.getByRole('button', { name: 'Send Reply' }));

    expect(await screen.findByText('Failed to send reply. Please try again.')).toBeInTheDocument();
    expect(onReplySent).not.toHaveBeenCalled();
  });
});
