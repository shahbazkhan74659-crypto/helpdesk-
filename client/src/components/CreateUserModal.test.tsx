import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiPost } from '../lib/api';
import { renderWithQuery } from '../test/renderWithQuery';
import CreateUserModal from './CreateUserModal';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiPost: vi.fn() };
});

const mockedApiPost = vi.mocked(apiPost);

function renderModal(onOpenChange = vi.fn()) {
  renderWithQuery(<CreateUserModal open onOpenChange={onOpenChange} />);
  return { onOpenChange };
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Name'), 'Jane Doe');
  await user.type(screen.getByLabelText('Email'), 'jane@test.local');
  await user.type(screen.getByLabelText('Password'), 'password123');
}

describe('CreateUserModal', () => {
  beforeEach(() => {
    mockedApiPost.mockReset();
  });

  it('renders no dialog when closed', () => {
    renderWithQuery(<CreateUserModal open={false} onOpenChange={vi.fn()} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the Name, Email, Password fields and a submit button when open', () => {
    renderModal();

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create user' })).toBeInTheDocument();
  });

  it('shows validation errors for a short name, invalid email, and short password', async () => {
    const user = userEvent.setup();
    renderModal();

    await user.type(screen.getByLabelText('Name'), 'Jo');
    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('Name must be at least 3 characters')).toBeInTheDocument();
    expect(screen.getByText('Enter a valid email')).toBeInTheDocument();
    expect(screen.getByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mockedApiPost).not.toHaveBeenCalled();
  });

  it('creates the user and closes the modal on valid submit', async () => {
    mockedApiPost.mockResolvedValue({
      user: { id: '1', name: 'Jane Doe', email: 'jane@test.local', role: 'agent', createdAt: '2026-07-08T00:00:00.000Z' },
    });
    const user = userEvent.setup();
    const { onOpenChange } = renderModal();

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
  });

  it('shows a conflict message and keeps the modal open when the email is already taken', async () => {
    mockedApiPost.mockRejectedValue(new ApiError(409, 'email_taken'));
    const user = userEvent.setup();
    const { onOpenChange } = renderModal();

    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Create user' }));

    expect(await screen.findByText('A user with this email already exists.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
