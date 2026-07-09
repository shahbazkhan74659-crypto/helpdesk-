import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet } from '../lib/api';
import { MessageSender, TicketPriority, TicketStatus } from '../lib/ticket';
import { renderWithQuery } from '../test/renderWithQuery';
import TicketDetailPage from './TicketDetailPage';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiGet: vi.fn() };
});

const mockedApiGet = vi.mocked(apiGet);

function renderTicketDetailPage(id = '42') {
  return renderWithQuery(<TicketDetailPage />, { route: `/tickets/${id}`, path: 'tickets/:id' });
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('shows skeletons while the request is pending', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderTicketDetailPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders the ticket subject, badges, and conversation', async () => {
    mockedApiGet.mockResolvedValue({
      id: 42,
      subject: 'Printer jammed again',
      status: TicketStatus.open,
      priority: TicketPriority.urgent,
      category: null,
      studentEmail: 'student@example.edu',
      createdAt: '2026-07-10T09:00:00.000Z',
      messages: [
        { id: 'm1', sender: MessageSender.student, body: 'It is jammed.', sentAt: '2026-07-10T09:00:00.000Z' },
        { id: 'm2', sender: MessageSender.agent, body: 'Please try again.', sentAt: '2026-07-10T09:05:00.000Z' },
      ],
    });

    renderTicketDetailPage();

    expect(await screen.findByRole('heading', { name: 'Printer jammed again' })).toBeInTheDocument();
    expect(screen.getByText(/student@example\.edu/)).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('It is jammed.')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
    expect(mockedApiGet).toHaveBeenCalledWith('/api/tickets/42');
  });

  it('shows a not-found message on a 404', async () => {
    mockedApiGet.mockRejectedValue(new ApiError(404, 'not found'));

    renderTicketDetailPage();

    expect(await screen.findByText('Ticket not found.')).toBeInTheDocument();
  });

  it('shows a generic error message on other failures', async () => {
    mockedApiGet.mockRejectedValue(new Error('network error'));

    renderTicketDetailPage();

    expect(await screen.findByText('Failed to load ticket. Please try again.')).toBeInTheDocument();
  });
});
