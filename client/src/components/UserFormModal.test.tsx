import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiPatch, apiPost } from '../lib/api';
import { Role } from '../lib/role';
import { renderWithQuery } from '../test/renderWithQuery';
import UserFormModal from './UserFormModal';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiPost: vi.fn(), apiPatch: vi.fn() };
});

const mockedApiPost = vi.mocked(apiPost);
const mockedApiPatch = vi.mocked(apiPatch);

const existingUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@test.local',
  role: Role.agent,
  createdAt: '2026-07-05T17:41:22.695Z',
};

function renderCreateModal(onOpenChange = vi.fn()) {
  renderWithQuery(<UserFormModal open onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

function renderEditModal(onOpenChange = vi.fn()) {
  renderWithQuery(<UserFormModal open onOpenChange={onOpenChange} user={existingUser} />);
  return { onOpenChange };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Email'), 'jane@test.local');
  await user.type(screen.getByLabelText('Password'), 'password123');
}

describe('UserFormModal — create mode', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
    mockedApiPatch.mockReset();
  });

  it('renders no dialog when closed', () => {
    renderWithQuery(<UserFormModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the Name, Email, Password fields and a submit button when open', () => {
    renderCreateModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Create user' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument();
  });

  it('renders empty fields', () => {
    renderCreateModal();

    expect(screen.getByLabelText('Name')).toHaveValue('');
    expect(screen.getByLabelText('Email')).toHaveValue('');
    expect(screen.getByLabelText('Password')).toHaveValue('');
  });

  it('shows validation errors for a short name, invalid email, and short password', async () => {
    const user = userEvent.setup();
    renderCreateModal();

    await user.type(screen.getByLabelText('Name'), 'Jo');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('shows "Name is required" and a red border for a whitespace-only name, without hitting the API', async () => {
    const user = userEvent.setup();
    renderCreateModal();

    await user.type(screen.getByLabelText('Name'), '   ');
    await user.type(screen.getByLabelText('Email'), 'jane@test.local');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Name is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('shows "Password is required" and a red border for a whitespace-only password, without hitting the API', async () => {
    const user = userEvent.setup();
    renderCreateModal();

    await user.type(screen.getByLabelText('Name'), 'Jane Doe');
    await user.type(screen.getByLabelText('Email'), 'jane@test.local');
    await user.type(screen.getByLabelText('Password'), '        ');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Password is required')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toHaveAttribute('aria-invalid', 'true');
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('creates the user and closes the modal on valid submit', async () => {
    mockedApiPost.mockResolvedValue({
      user: { id: '1', name: 'Jane Doe', email: 'jane@test.local', role: Role.agent, createdAt: '2026-07-08T00:00:00.000Z' },
    });
    const user = userEvent.setup();
    const { onOpenChange } = renderCreateModal();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    await waitFor(() => {
      expect(mockedApiPost).toHaveBeenCalledWith('/api/users', {
        name: 'Jane Doe',
        email: 'jane@test.local',
        password: 'password123',
      });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockedApiPatch).not.toHaveBeenCalled();
  });

  it('shows a conflict message and keeps the modal open when the email is already taken', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'email_taken'));
    const user = userEvent.setup();
    const { onOpenChange } = renderCreateModal();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('A user with this email already exists.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});

describe('UserFormModal — edit mode', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
    mockedApiPatch.mockReset();
  });

  it('renders the dialog pre-filled with the user’s data and a blank password', () => {
    renderEditModal();

    expect(screen.getByRole('heading', { name: 'Edit user' })).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toHaveValue('Jane Doe');
    expect(screen.getByLabelText('Email')).toHaveValue('jane@test.local');
    expect(screen.getByLabelText('Password')).toHaveValue('');
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeInTheDocument();
  });

  it('submits changed name/email without a password key when the password is left blank', async () => {
    mockedApiPatch.mockResolvedValue({ user: { ...existingUser, name: 'Jane Smith' } });
    const user = userEvent.setup();
    const { onOpenChange } = renderEditModal();

    await user.clear(screen.getByLabelText('Name'));
    await user.type(screen.getByLabelText('Name'), 'Jane Smith');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockedApiPatch).toHaveBeenCalledWith('/api/users/user-1', {
        name: 'Jane Smith',
        email: 'jane@test.local',
      });
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('includes the password in the payload when a new one is provided', async () => {
    mockedApiPatch.mockResolvedValue({ user: existingUser });
    const user = userEvent.setup();
    renderEditModal();

    await user.type(screen.getByLabelText('Password'), 'newpassword123');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    await waitFor(() => {
      expect(mockedApiPatch).toHaveBeenCalledWith('/api/users/user-1', {
        name: 'Jane Doe',
        email: 'jane@test.local',
        password: 'newpassword123',
      });
    });
  });

  it('shows a validation error for a too-short password instead of treating it as unchanged', async () => {
    const user = userEvent.setup();
    renderEditModal();

    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mockedApiPatch).not.toHaveBeenCalled();
  });

  it('shows a conflict message and keeps the modal open when the email is already taken', async () => {
    mockedApiPatch.mockRejectedValue(new ApiError(409, 'email_taken'));
    const user = userEvent.setup();
    const { onOpenChange } = renderEditModal();

    await user.click(screen.getByRole('button', { name: 'Save changes' }));

    expect(await screen.findByText('A user with this email already exists.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
