import { screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { apiGet } from '../lib/api';
import { renderWithQuery } from '../test/renderWithQuery';
import HomePage from './HomePage';

vi.mock('../lib/api', () => ({ apiGet: vi.fn() }));

const mockedApiGet = vi.mocked(apiGet);

function renderHomePage() {
  return renderWithQuery(<HomePage />);
}

const FULL_STATS = {
  totalTickets: 42,
  openTickets: 10,
  resolvedCount: 30,
  aiResolvedCount: 9,
  agentResolvedCount: 21,
  aiResolvedPercent: 30,
  agentResolvedPercent: 70,
  avgResolutionSeconds: 5400,
};

const FULL_DAILY = {
  days: [
    { date: '2026-07-09', count: 2 },
    { date: '2026-07-10', count: 5 },
  ],
};

function mockStats(stats: unknown = FULL_STATS, daily: unknown = FULL_DAILY) {
  mockedApiGet.mockImplementation((path: string) => {
    if (path === '/api/tickets/stats/daily') {
      return Promise.resolve(daily);
    }
    return Promise.resolve(stats);
  });
}

describe('HomePage', () => {
  beforeEach(() => {
    mockedApiGet.mockReset();
  });

  it('shows the heading and skeletons while the requests are pending', () => {
    mockedApiGet.mockReturnValue(new Promise(() => {}));

    renderHomePage();

    expect(screen.getByRole('heading', { name: 'Home' })).toBeInTheDocument();
    // 6 stat tiles + 1 chart skeleton.
    expect(document.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(7);
  });

  it('renders the fetched stats, including the formatted duration and AI/Agent split', async () => {
    mockStats();

    renderHomePage();

    expect(await screen.findByText('42')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('21')).toBeInTheDocument();
    expect(screen.getByText('30% AI / 70% Agent')).toBeInTheDocument();
    expect(screen.getByText('1h 30m')).toBeInTheDocument();
    expect(mockedApiGet).toHaveBeenCalledWith('/api/tickets/stats');
  });

  it('shows N/A for the split and average when there are no resolved tickets', async () => {
    mockStats({
      ...FULL_STATS,
      aiResolvedPercent: null,
      agentResolvedPercent: null,
      avgResolutionSeconds: null,
    });

    renderHomePage();

    expect(await screen.findAllByText('N/A')).toHaveLength(2);
  });

  it('shows an error message when the stats request fails', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/api/tickets/stats/daily') {
        return Promise.resolve(FULL_DAILY);
      }
      return Promise.reject(new Error('network error'));
    });

    renderHomePage();

    expect(await screen.findByText('Failed to load dashboard stats. Please try again.')).toBeInTheDocument();
  });

  it('renders the tickets-per-day chart with a bar and table row per day', async () => {
    mockStats();

    renderHomePage();

    expect(screen.getByText('Tickets per day')).toBeInTheDocument();
    expect(await screen.findByRole('img', { name: '10 Jul: 5 tickets' })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: '9 Jul: 2 tickets' })).toBeInTheDocument();
    expect(mockedApiGet).toHaveBeenCalledWith('/api/tickets/stats/daily');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '5' })).toBeInTheDocument();
  });

  it('shows an error message when the daily chart request fails', async () => {
    mockedApiGet.mockImplementation((path: string) => {
      if (path === '/api/tickets/stats/daily') {
        return Promise.reject(new Error('network error'));
      }
      return Promise.resolve(FULL_STATS);
    });

    renderHomePage();

    expect(await screen.findByText('Failed to load ticket volume. Please try again.')).toBeInTheDocument();
  });
});
