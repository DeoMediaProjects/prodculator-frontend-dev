import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const enqueueSnackbar = vi.fn();

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/app/theme/AppTheme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/theme/AppTheme')>()),
  useThemeMode: () => ({ mode: 'light', setMode: vi.fn() }),
}));

vi.mock('@/services/admin.api', () => ({
  adminApi: {
    getSubscriberMetrics: vi.fn(),
    getSubscribers: vi.fn(),
    blockSubscriber: vi.fn(),
    unblockSubscriber: vi.fn(),
    creditSubscriber: vi.fn(),
  },
}));

import { useAuth } from '@/app/contexts/AuthContext';
import { adminApi } from '@/services/admin.api';
import { ScriptAIOverview } from '../ScriptAIOverview';

const mockUseAuth = vi.mocked(useAuth);
const api = vi.mocked(adminApi);

function asAdminWith(canManageSubscribers: boolean) {
  mockUseAuth.mockReturnValue({
    hasAdminPermission: (p: string) => p === 'canManageSubscribers' && canManageSubscribers,
  } as any);
}

beforeEach(() => {
  vi.clearAllMocks();
  api.getSubscriberMetrics.mockResolvedValue({
    data: {
      total_paid_users: 1, mrr_usd: 0, mrr_gbp: 49, reports_this_month_total: 0,
      reports_this_month_free: 0, reports_this_month_paid: 0, avg_reports_per_user: 0,
      plan_distribution: [],
    },
    error: null,
  } as any);
  api.getSubscribers.mockResolvedValue({
    data: {
      items: [{
        id: 'u1', name: 'Alice Doe', email: 'alice@example.com', company: 'AlphaCo',
        plan: 'professional', status: 'Active', reports_this_month: 0, report_limit: 10,
        monthly_spend: 49, payment_currency: 'GBP', join_date: '2026-01-10',
        last_active: null, total_reports_generated: 0,
      }],
      total: 1, limit: 500, offset: 0,
      counts: { active: 1, past_due: 0, canceled: 0 },
    },
    error: null,
  } as any);
});

describe('ScriptAIOverview', () => {
  it('hides block and credit actions from a role the backend would refuse', async () => {
    asAdminWith(false);
    render(<ScriptAIOverview />);

    expect(await screen.findByText('Alice Doe')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Block this account' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Adjust report credits' })).not.toBeInTheDocument();
  });

  it('says so when a block fails instead of doing nothing', async () => {
    asAdminWith(true);
    api.blockSubscriber.mockResolvedValue({ data: null, error: 'Permission denied' } as any);
    render(<ScriptAIOverview />);

    await userEvent.click(await screen.findByRole('button', { name: 'Block this account' }));

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('Permission denied'), { variant: 'error' },
    ));
  });

  it('refuses a credit adjustment above the cap before it reaches the API', async () => {
    asAdminWith(true);
    render(<ScriptAIOverview />);

    await userEvent.click(await screen.findByRole('button', { name: 'Adjust report credits' }));
    await userEvent.type(screen.getByLabelText('Credit adjustment'), '500');

    expect(screen.getByRole('button', { name: 'Apply' })).toBeDisabled();
    expect(api.creditSubscriber).not.toHaveBeenCalled();
  });

  it('keeps the credit dialog open and reports a failed adjustment', async () => {
    asAdminWith(true);
    api.creditSubscriber.mockResolvedValue({ data: null, error: 'Server error' } as any);
    render(<ScriptAIOverview />);

    await userEvent.click(await screen.findByRole('button', { name: 'Adjust report credits' }));
    await userEvent.type(screen.getByLabelText('Credit adjustment'), '5');
    await userEvent.click(screen.getByRole('button', { name: 'Apply' }));

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('Server error'), { variant: 'error' },
    ));
    expect(screen.getByLabelText('Credit adjustment')).toBeInTheDocument();
    expect(api.creditSubscriber).toHaveBeenCalledWith('u1', { adjustment: 5, reason: undefined });
  });
});
