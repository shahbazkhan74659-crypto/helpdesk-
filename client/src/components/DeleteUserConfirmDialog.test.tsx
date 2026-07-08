import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiDelete } from '../lib/api';
import { Role } from '../lib/role';
import { renderWithQuery } from '../test/renderWithQuery';
import DeleteUserConfirmDialog from './DeleteUserConfirmDialog';

vi.mock('../lib/api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/api')>();
  return { ...actual, apiDelete: vi.fn() };
});

const mockedApiDelete = vi.mocked(apiDelete);

const existingUser = {
  id: 'user-1',
  name: 'Jane Doe',
  email: 'jane@test.local',
  role: Role.agent,
  createdAt: '2026-07-05T17:41:22.695Z',
};

function renderDialog(onOpenChange = vi.fn()) {
  renderWithQuery(<DeleteUserConfirmDialog open onOpenChange={onOpenChange} user={existingUser} />);
  return { onOpenChange };
}

describe('DeleteUserConfirmDialog', () => {
  beforeEach(() => {
    mockedApiDelete.mockReset();
  });

  it('renders no dialog when closed', () => {
    renderWithQuery(<DeleteUserConfirmDialog open={false} onOpenChange={vi.fn()} user={existingUser} />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('renders the target user’s name and email in the confirmation text when open', () => {
    renderDialog();

    expect(screen.getByRole('heading', { name: 'Delete user' })).toBeInTheDocument();
    expect(screen.getByText('Jane Doe', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('jane@test.local', { exact: false })).toBeInTheDocument();
  });

  it('calls apiDelete with the correct path and closes the dialog on confirm', async () => {
    mockedApiDelete.mockResolvedValue({ success: true });
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(mockedApiDelete).toHaveBeenCalledWith('/api/users/user-1');
    });
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('shows an error and keeps the dialog open when the API rejects with 400', async () => {
    mockedApiDelete.mockRejectedValue(new ApiError(400, 'cannot_delete_self'));
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByText('You can’t delete your own account.')).toBeInTheDocument();
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });

  it('hides the dialog when Cancel is clicked', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockedApiDelete).not.toHaveBeenCalled();
  });

  it('hides the dialog when Escape is pressed', async () => {
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
    expect(mockedApiDelete).not.toHaveBeenCalled();
  });
});
