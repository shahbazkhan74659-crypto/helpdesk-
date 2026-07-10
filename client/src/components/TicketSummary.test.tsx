import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiPost } from '../lib/api';
import { renderWithQuery } from '../test/renderWithQuery';
import TicketSummary from './TicketSummary';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiPost: vi.fn() };
});

const mockedApiPost = vi.mocked(apiPost);

describe('TicketSummary', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
  });

  it('renders a Summarize button and no summary initially', () => {
    renderWithQuery(<TicketSummary ticketId={42} />);

    expect(screen.getByRole('button', { name: 'Summarize' })).toBeInTheDocument();
    expect(screen.queryByText('Summary')).not.toBeInTheDocument();
  });

  it('requests and displays a summary when clicked', async () => {
    mockedApiPost.mockResolvedValue({ summary: 'Student has a jammed printer; agent asked them to retry.' });
    const user = userEvent.setup();
    renderWithQuery(<TicketSummary ticketId={42} />);

    await user.click(screen.getByRole('button', { name: 'Summarize' }));

    expect(mockedApiPost).toHaveBeenCalledWith('/api/tickets/42/summarize', {});
    expect(
      await screen.findByText('Student has a jammed printer; agent asked them to retry.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Regenerate Summary' })).toBeInTheDocument();
  });

  it('re-generates the summary on each click', async () => {
    mockedApiPost.mockResolvedValueOnce({ summary: 'First summary.' });
    const user = userEvent.setup();
    renderWithQuery(<TicketSummary ticketId={42} />);

    await user.click(screen.getByRole('button', { name: 'Summarize' }));
    await screen.findByText('First summary.');

    mockedApiPost.mockResolvedValueOnce({ summary: 'Second summary.' });
    await user.click(screen.getByRole('button', { name: 'Regenerate Summary' }));

    expect(mockedApiPost).toHaveBeenCalledTimes(2);
    await waitFor(() => expect(screen.getByText('Second summary.')).toBeInTheDocument());
    expect(screen.queryByText('First summary.')).not.toBeInTheDocument();
  });

  it('shows an error message when summarizing fails', async () => {
    mockedApiPost.mockRejectedValue(new Error('network error'));
    const user = userEvent.setup();
    renderWithQuery(<TicketSummary ticketId={42} />);

    await user.click(screen.getByRole('button', { name: 'Summarize' }));

    expect(await screen.findByText('Failed to summarize ticket. Please try again.')).toBeInTheDocument();
  });
});
