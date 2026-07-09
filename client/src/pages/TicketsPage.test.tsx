import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../lib/api';
import { TicketPriority, TicketStatus } from '../lib/ticket';
import { renderWithQuery } from '../test/renderWithQuery';
import TicketsPage from './TicketsPage';

vi.mock('../lib/api', () => ({ apiGet: vi.fn() }));

const mockedApiGet = vi.mocked(apiGet);

function renderTicketsPage() {
  return renderWithQuery(<TicketsPage />);
}

describe('TicketsPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('shows the heading and skeleton rows while the request is pending', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderTicketsPage();

    expect(screen.getByRole('heading', { name: 'Tickets' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(15);
  });

  it('renders the fetched tickets newest first', async () => {
    mockedApiGet.mockResolvedValue({
      tickets: [
        {
          id: 2,
          subject: 'Printer jammed again',
          status: TicketStatus.open,
          priority: TicketPriority.urgent,
          category: null,
          studentEmail: 'newer@example.edu',
          createdAt: '2026-07-10T09:00:00.000Z',
        },
        {
          id: 1,
          subject: 'Cannot log into my account',
          status: TicketStatus.resolved,
          priority: TicketPriority.low,
          category: null,
          studentEmail: 'older@example.edu',
          createdAt: '2026-07-09T07:11:03.442Z',
        },
      ],
    });

    renderTicketsPage();

    expect(await screen.findByText('Printer jammed again')).toBeInTheDocument();
    expect(screen.getByText('Cannot log into my account')).toBeInTheDocument();

    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);

    const [, firstRow, secondRow] = screen.getAllByRole('row');
    expect(firstRow).toHaveTextContent('newer@example.edu');
    expect(secondRow).toHaveTextContent('older@example.edu');
  });

  it('shows an error message when the request fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network error'));

    renderTicketsPage();

    expect(await screen.findByText('Failed to load tickets. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('requests tickets sorted by createdAt desc by default', async () => {
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    expect(mockedApiGet).toHaveBeenCalledWith('/api/tickets?sortBy=createdAt&sortDir=desc');
  });

  it('re-fetches with the new column and ascending direction when a header is clicked', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /requester/i }));

    expect(mockedApiGet).toHaveBeenLastCalledWith('/api/tickets?sortBy=studentEmail&sortDir=asc');
  });

  it('toggles direction when the same header is clicked again', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.click(screen.getByRole('button', { name: /created/i }));

    expect(mockedApiGet).toHaveBeenLastCalledWith('/api/tickets?sortBy=createdAt&sortDir=asc');
  });

  it('re-fetches with a status filter when one is selected', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.click(screen.getByRole('combobox', { name: /filter by status/i }));
    await user.click(await screen.findByRole('option', { name: /^resolved$/i }));

    expect(mockedApiGet).toHaveBeenLastCalledWith('/api/tickets?sortBy=createdAt&sortDir=desc&status=resolved');
  });

  it('re-fetches with a priority filter when one is selected', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.click(screen.getByRole('combobox', { name: /filter by priority/i }));
    await user.click(await screen.findByRole('option', { name: /^urgent$/i }));

    expect(mockedApiGet).toHaveBeenLastCalledWith('/api/tickets?sortBy=createdAt&sortDir=desc&priority=urgent');
  });

  it('re-fetches with a category filter when one is selected', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.click(screen.getByRole('combobox', { name: /filter by category/i }));
    await user.click(await screen.findByRole('option', { name: /refund request/i }));

    expect(mockedApiGet).toHaveBeenLastCalledWith(
      '/api/tickets?sortBy=createdAt&sortDir=desc&category=refund_request',
    );
  });

  it('re-fetches with the search term after the user stops typing', async () => {
    const user = userEvent.setup();
    mockedApiGet.mockResolvedValue({ tickets: [] });

    renderTicketsPage();

    await screen.findByRole('table');
    await user.type(screen.getByPlaceholderText(/search subject or requester email/i), 'printer');

    await waitFor(() => {
      expect(mockedApiGet).toHaveBeenLastCalledWith('/api/tickets?sortBy=createdAt&sortDir=desc&search=printer');
    });
  });
});
