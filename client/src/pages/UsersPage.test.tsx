import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../lib/api';
import { renderWithQuery } from '../test/renderWithQuery';
import UsersPage from './UsersPage';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn() };
});

const mockedApiGet = vi.mocked(apiGet);

function renderUsersPage() {
  return renderWithQuery(<UsersPage />);
}

describe('UsersPage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('shows the heading and skeleton rows while the request is pending', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderUsersPage();

    expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(12);
  });

  it('renders the fetched users with the admin role highlighted', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@test.local',
          role: 'admin',
          createdAt: '2026-07-05T17:41:22.695Z',
        },
        {
          id: '2',
          name: 'Test Agent',
          email: 'agent@test.local',
          role: 'agent',
          createdAt: '2026-07-06T05:52:59.272Z',
        },
      ],
    });

    renderUsersPage();

    expect(await screen.findByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('admin@test.local')).toBeInTheDocument();
    expect(screen.getByText('Test Agent')).toBeInTheDocument();
    expect(screen.getByText('agent@test.local')).toBeInTheDocument();

    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(0);

    const [, adminRow, agentRow] = screen.getAllByRole('row');
    const adminRoleCell = within(adminRow).getAllByRole('cell')[2];
    const agentRoleCell = within(agentRow).getAllByRole('cell')[2];

    expect(adminRoleCell.querySelector('.bg-primary')).not.toBeNull();
    expect(agentRoleCell.querySelector('.bg-primary')).toBeNull();
    expect(adminRoleCell).toHaveTextContent('admin');
    expect(agentRoleCell).toHaveTextContent('agent');
  });

  it('shows an error message when the request fails', async () => {
    mockedApiGet.mockRejectedValue(new Error('network error'));

    renderUsersPage();

    expect(await screen.findByText('Failed to load users. Please try again.')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('renders a "Create user" button above the table', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderUsersPage();

    expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument();
  });

  it('shows the create user dialog when the "Create user" button is clicked', async () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderUsersPage();

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('hides the create user dialog when Escape is pressed', async () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('hides the create user dialog when the Cancel button is clicked', async () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(screen.getByRole('button', { name: 'Create user' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
