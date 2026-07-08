import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../lib/api';
import { Role } from '../lib/role';
import { renderWithQuery } from '../test/renderWithQuery';
import UsersPage from './UsersPage';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiGet: vi.fn(), apiPost: vi.fn(), apiPatch: vi.fn(), apiDelete: vi.fn() };
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
          role: Role.admin,
          createdAt: '2026-07-05T17:41:22.695Z',
        },
        {
          id: '2',
          name: 'Test Agent',
          email: 'agent@test.local',
          role: Role.agent,
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
    expect(adminRoleCell).toHaveTextContent(Role.admin);
    expect(agentRoleCell).toHaveTextContent(Role.agent);
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

  it('renders an edit button for each user', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@test.local',
          role: Role.admin,
          createdAt: '2026-07-05T17:41:22.695Z',
        },
      ],
    });

    renderUsersPage();

    expect(await screen.findByRole('button', { name: 'Edit Admin' })).toBeInTheDocument();
  });

  it('opens the edit dialog pre-filled with the row\'s data when its edit button is clicked', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@test.local',
          role: Role.admin,
          createdAt: '2026-07-05T17:41:22.695Z',
        },
      ],
    });
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Admin' }));

    expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Admin');
    expect(screen.getByLabelText('Email')).toHaveValue('admin@test.local');
  });

  it('hides the edit dialog when Cancel is clicked', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@test.local',
          role: Role.admin,
          createdAt: '2026-07-05T17:41:22.695Z',
        },
      ],
    });
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(await screen.findByRole('button', { name: 'Edit Admin' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders a delete button for a non-admin user, but not for an admin', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '1',
          name: 'Admin',
          email: 'admin@test.local',
          role: Role.admin,
          createdAt: '2026-07-05T17:41:22.695Z',
        },
        {
          id: '2',
          name: 'Test Agent',
          email: 'agent@test.local',
          role: Role.agent,
          createdAt: '2026-07-06T05:52:59.272Z',
        },
      ],
    });

    renderUsersPage();

    expect(await screen.findByRole('button', { name: 'Delete Test Agent' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Delete Admin' })).not.toBeInTheDocument();
  });

  it('opens the delete confirmation dialog with the row\'s user when its delete button is clicked', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '2',
          name: 'Test Agent',
          email: 'agent@test.local',
          role: Role.agent,
          createdAt: '2026-07-06T05:52:59.272Z',
        },
      ],
    });
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Test Agent' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('heading', { name: 'Delete user' })).toBeInTheDocument();
    expect(within(dialog).getByText('Test Agent')).toBeInTheDocument();
    expect(within(dialog).getByText('agent@test.local', { exact: false })).toBeInTheDocument();
  });

  it('hides the delete dialog when Cancel is clicked', async () => {
    mockedApiGet.mockResolvedValue({
      users: [
        {
          id: '2',
          name: 'Test Agent',
          email: 'agent@test.local',
          role: Role.agent,
          createdAt: '2026-07-06T05:52:59.272Z',
        },
      ],
    });
    const user = userEvent.setup();

    renderUsersPage();

    await user.click(await screen.findByRole('button', { name: 'Delete Test Agent' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });
});
