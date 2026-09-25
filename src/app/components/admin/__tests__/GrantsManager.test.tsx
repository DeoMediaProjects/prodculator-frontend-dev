import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const enqueueSnackbar = vi.fn();

vi.mock('notistack', () => ({
  useSnackbar: () => ({ enqueueSnackbar }),
}));

vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: () => ({ hasAdminPermission: () => true }),
}));

vi.mock('@/app/theme/AppTheme', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/app/theme/AppTheme')>()),
  useThemeMode: () => ({ mode: 'light', setMode: vi.fn() }),
}));

vi.mock('@/services/api', () => ({
  getTerritories: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/services/admin.api', () => ({
  adminApi: {
    getGrants: vi.fn(),
    getGrantSyncStatus: vi.fn(),
    getGrantPendingChanges: vi.fn(),
    deleteGrant: vi.fn(),
  },
}));

import { adminApi } from '@/services/admin.api';
import { GrantsManager } from '../GrantsManager';

const api = vi.mocked(adminApi);

beforeEach(() => {
  vi.clearAllMocks();
  api.getGrants.mockResolvedValue({
    data: {
      items: [{
        id: 'g1', title: 'Screen Fund Development', territory: 'United Kingdom',
        fundingBody: 'BFI', maxAmount: '50000', currency: 'GBP', applicationOpens: '',
        applicationDeadline: '', status: 'open', daysUntilDeadline: null, eligibility: [],
        websiteUrl: 'https://example.org', dataSource: 'manual', verified: true, isNew: false,
        createdAt: '2026-01-01', updatedAt: '2026-01-01',
      }],
      total: 1, limit: 500, offset: 0,
    },
    error: null,
  } as any);
  api.getGrantSyncStatus.mockResolvedValue({ data: null, error: null } as any);
  api.getGrantPendingChanges.mockResolvedValue({ data: [], error: null } as any);
});

describe('GrantsManager delete', () => {
  it('reports a failed delete and keeps the grant and the dialog', async () => {
    api.deleteGrant.mockResolvedValue({ data: null, error: 'Permission denied' } as any);
    render(<GrantsManager />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete this grant' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(enqueueSnackbar).toHaveBeenCalledWith(
      expect.stringContaining('Permission denied'), { variant: 'error' },
    ));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getAllByText('Screen Fund Development').length).toBeGreaterThan(0);
  });

  it('removes the grant when the delete succeeds', async () => {
    api.deleteGrant.mockResolvedValue({ data: { success: true }, error: null } as any);
    render(<GrantsManager />);

    await userEvent.click(await screen.findByRole('button', { name: 'Delete this grant' }));
    const dialog = await screen.findByRole('dialog');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(screen.queryByText('Screen Fund Development')).not.toBeInTheDocument());
    expect(enqueueSnackbar).not.toHaveBeenCalled();
  });
});
