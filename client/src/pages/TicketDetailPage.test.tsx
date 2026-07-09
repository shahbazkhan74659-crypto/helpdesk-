import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiGet, apiPatch } from '../lib/api';
import { MessageSender, TicketCategory, TicketPriority, TicketStatus } from '../lib/ticket';
import { renderWithQuery } from '../test/renderWithQuery';
import TicketDetailPage from './TicketDetailPage';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiGet: vi.fn(), apiPatch: vi.fn() };
});

const mockedApiGet = vi.mocked(apiGet);
const mockedApiPatch = vi.mocked(apiPatch);

type Agent = { id: string; name: string; email: string };

const AGENTS: Agent[] = [
  { id: 'agent-1', name: 'Jane Agent', email: 'jane@example.edu' },
  { id: 'agent-2', name: 'Sam Agent', email: 'sam@example.edu' },
];

const BASE_TICKET: {
  id: number;
  subject: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory | null;
  studentEmail: string;
  createdAt: string;
  updatedAt: string;
  assignedAgent: Agent | null;
  messages: { id: string; sender: MessageSender; body: string; sentAt: string }[];
} = {
  id: 42,
  subject: 'Printer jammed again',
  status: TicketStatus.open,
  priority: TicketPriority.urgent,
  category: null,
  studentEmail: 'student@example.edu',
  createdAt: '2026-07-10T09:00:00.000Z',
  updatedAt: '2026-07-10T09:05:00.000Z',
  assignedAgent: null,
  messages: [
    { id: 'm1', sender: MessageSender.student, body: 'It is jammed.', sentAt: '2026-07-10T09:00:00.000Z' },
    { id: 'm2', sender: MessageSender.agent, body: 'Please try again.', sentAt: '2026-07-10T09:05:00.000Z' },
  ],
};

function mockTicketAndAgents(ticket: typeof BASE_TICKET) {
  mockedApiGet.mockImplementation((path: string) => {
    if (path === '/api/users/agents') {
      return Promise.resolve({ agents: AGENTS });
    }
    return Promise.resolve(ticket);
  });
}

function renderTicketDetailPage(id = '42') {
  return renderWithQuery(<TicketDetailPage />, { route: `/tickets/${id}`, path: 'tickets/:id' });
}

describe('TicketDetailPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
    mockedApiPatch.mockReset();
  });

  it('shows skeletons while the request is pending', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderTicketDetailPage();

    expect(document.querySelectorAll('[data-slot="skeleton"]').length).toBeGreaterThan(0);
  });

  it('renders the ticket subject, badges, and conversation', async () => {
    mockTicketAndAgents(BASE_TICKET);

    renderTicketDetailPage();

    expect(await screen.findByRole('heading', { name: 'Printer jammed again' })).toBeInTheDocument();
    expect(screen.getByText(/student@example\.edu/)).toBeInTheDocument();
    expect(screen.getByText('Assigned')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: /assigned agent/i })).toHaveTextContent('Unassigned');
    expect(screen.getByText('Updated at:')).toBeInTheDocument();
    expect(screen.getByText('open')).toBeInTheDocument();
    expect(screen.getByText('urgent')).toBeInTheDocument();
    expect(screen.getByText('It is jammed.')).toBeInTheDocument();
    expect(screen.getByText('Please try again.')).toBeInTheDocument();
    expect(mockedApiGet).toHaveBeenCalledWith('/api/tickets/42');
  });

  it('shows the currently assigned agent', async () => {
    mockTicketAndAgents({ ...BASE_TICKET, assignedAgent: AGENTS[0] });

    renderTicketDetailPage();

    expect(await screen.findByRole('combobox', { name: /assigned agent/i })).toHaveTextContent('Jane Agent');
  });

  it('assigns the ticket to the selected agent and refreshes Updated at', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents(BASE_TICKET);
    mockedApiPatch.mockResolvedValue({
      ...BASE_TICKET,
      assignedAgent: AGENTS[0],
      updatedAt: '2026-07-10T10:30:00.000Z',
    });

    renderTicketDetailPage();
    const updatedAtText = () => screen.getByText('Updated at:').closest('p')?.textContent ?? '';
    await screen.findByRole('combobox', { name: /assigned agent/i });
    const initialUpdatedAt = updatedAtText();

    await user.click(screen.getByRole('combobox', { name: /assigned agent/i }));
    await user.click(await screen.findByRole('option', { name: 'Jane Agent' }));

    expect(mockedApiPatch).toHaveBeenCalledWith('/api/tickets/42/assign', { assignedAgentId: 'agent-1' });
    expect(await screen.findByRole('combobox', { name: /assigned agent/i })).toHaveTextContent('Jane Agent');
    await waitFor(() => expect(updatedAtText()).not.toBe(initialUpdatedAt));
  });

  it('unassigns the ticket when Unassigned is selected', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents({ ...BASE_TICKET, assignedAgent: AGENTS[0] });
    mockedApiPatch.mockResolvedValue({ ...BASE_TICKET, assignedAgent: null });

    renderTicketDetailPage();

    const trigger = await screen.findByRole('combobox', { name: /assigned agent/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Unassigned' }));

    expect(mockedApiPatch).toHaveBeenCalledWith('/api/tickets/42/assign', { assignedAgentId: null });
    expect(await screen.findByRole('combobox', { name: /assigned agent/i })).toHaveTextContent('Unassigned');
  });

  it('shows an error message when assignment fails', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents(BASE_TICKET);
    mockedApiPatch.mockRejectedValue(new Error('network error'));

    renderTicketDetailPage();

    const trigger = await screen.findByRole('combobox', { name: /assigned agent/i });
    await user.click(trigger);
    await user.click(await screen.findByRole('option', { name: 'Jane Agent' }));

    expect(await screen.findByText('Failed to assign. Please try again.')).toBeInTheDocument();
  });

  it('updates the status when a new one is selected', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents(BASE_TICKET);
    mockedApiPatch.mockResolvedValue({ ...BASE_TICKET, status: TicketStatus.resolved });

    renderTicketDetailPage();

    await user.click(await screen.findByRole('combobox', { name: /ticket status/i }));
    await user.click(await screen.findByRole('option', { name: /^resolved$/i }));

    expect(mockedApiPatch).toHaveBeenCalledWith('/api/tickets/42/status', { status: 'resolved' });
    expect(await screen.findByRole('combobox', { name: /ticket status/i })).toHaveTextContent('resolved');
  });

  it('updates the category when a new one is selected', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents(BASE_TICKET);
    mockedApiPatch.mockResolvedValue({ ...BASE_TICKET, category: TicketCategory.refund_request });

    renderTicketDetailPage();

    await user.click(await screen.findByRole('combobox', { name: /ticket category/i }));
    await user.click(await screen.findByRole('option', { name: /refund request/i }));

    expect(mockedApiPatch).toHaveBeenCalledWith('/api/tickets/42/category', { category: 'refund_request' });
    expect(await screen.findByRole('combobox', { name: /ticket category/i })).toHaveTextContent('refund request');
  });

  it('clears the category when No category is selected', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents({ ...BASE_TICKET, category: TicketCategory.technical_question });
    mockedApiPatch.mockResolvedValue({ ...BASE_TICKET, category: null });

    renderTicketDetailPage();

    await user.click(await screen.findByRole('combobox', { name: /ticket category/i }));
    await user.click(await screen.findByRole('option', { name: /^no category$/i }));

    expect(mockedApiPatch).toHaveBeenCalledWith('/api/tickets/42/category', { category: null });
    expect(await screen.findByRole('combobox', { name: /ticket category/i })).toHaveTextContent('No category');
  });

  it('shows an error message when a status update fails', async () => {
    const user = userEvent.setup();
    mockTicketAndAgents(BASE_TICKET);
    mockedApiPatch.mockRejectedValue(new Error('network error'));

    renderTicketDetailPage();

    await user.click(await screen.findByRole('combobox', { name: /ticket status/i }));
    await user.click(await screen.findByRole('option', { name: /^resolved$/i }));

    expect(await screen.findByText('Failed to update ticket. Please try again.')).toBeInTheDocument();
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
