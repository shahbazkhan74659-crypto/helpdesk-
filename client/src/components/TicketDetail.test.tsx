import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TicketDetail from './TicketDetail';

describe('TicketDetail', () => {
  it('renders the subject, created/updated dates, sender, and message body', () => {
    render(
      <TicketDetail
        subject="Printer jammed again"
        studentEmail="student@example.edu"
        createdAt="2026-07-10T09:00:00.000Z"
        updatedAt="2026-07-10T09:05:00.000Z"
        message="It is jammed."
      />,
    );

    expect(screen.getByRole('heading', { name: 'Printer jammed again' })).toBeInTheDocument();
    expect(screen.getByText('Message')).toBeInTheDocument();
    expect(
      screen.getByText(`Created: ${new Date('2026-07-10T09:00:00.000Z').toLocaleString()}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`Updated: ${new Date('2026-07-10T09:05:00.000Z').toLocaleString()}`),
    ).toBeInTheDocument();
    expect(screen.getByText('From student@example.edu')).toBeInTheDocument();
    expect(screen.getByText('It is jammed.')).toBeInTheDocument();
  });

  it('shows a fallback and no sender line when there is no message', () => {
    render(
      <TicketDetail
        subject="Printer jammed again"
        studentEmail="student@example.edu"
        createdAt="2026-07-10T09:00:00.000Z"
        updatedAt="2026-07-10T09:05:00.000Z"
        message={null}
      />,
    );

    expect(screen.getByText('No message yet.')).toBeInTheDocument();
    expect(screen.queryByText(/^From /)).not.toBeInTheDocument();
  });
});
