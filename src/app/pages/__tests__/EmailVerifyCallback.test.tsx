import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('@/services/auth.service', () => ({
  authService: {
    verifyEmailToken: vi.fn(),
  },
}));

vi.mock('@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png', () => ({
  default: 'logo.png',
}));

import { authService } from '@/services/auth.service';
import { EmailVerifyCallback } from '../EmailVerifyCallback';

const mockVerify = vi.mocked(authService.verifyEmailToken);

function renderCallback(search = '') {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/auth/callback', search }]}>
      <Routes>
        <Route path="/auth/callback" element={<EmailVerifyCallback />} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/verify-email" element={<div>Verify Email</div>} />
      </Routes>
    </MemoryRouter>
  );
}

const flushAsync = () => act(async () => {});

describe('EmailVerifyCallback', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows loading state on initial render before the async effect resolves', () => {
    mockVerify.mockReturnValue(new Promise(() => {}));
    renderCallback('?token=pending-token');
    expect(screen.getByText('Verifying your email...')).toBeInTheDocument();
  });

  it('calls verifyEmailToken with the token from the query string and shows success', async () => {
    mockVerify.mockResolvedValue({ user: { id: '1', email: 'u@test.com', user_type: 'free' }, error: null });

    renderCallback('?token=valid-jwt-token');
    await flushAsync();

    expect(mockVerify).toHaveBeenCalledWith('valid-jwt-token');
    expect(screen.getByText('Email Verified!')).toBeInTheDocument();
    expect(screen.getByText(/Redirecting to your dashboard in 3s/)).toBeInTheDocument();
  });

  it('redirects to /dashboard automatically after 3s countdown', async () => {
    mockVerify.mockResolvedValue({ user: { id: '1', email: 'u@test.com', user_type: 'free' }, error: null });

    renderCallback('?token=valid-jwt-token');
    await flushAsync();

    expect(screen.getByText('Email Verified!')).toBeInTheDocument();

    for (let i = 0; i < 3; i++) {
      await act(async () => { vi.advanceTimersByTime(1000); });
    }

    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('navigates immediately when Go to Dashboard is clicked', async () => {
    mockVerify.mockResolvedValue({ user: { id: '1', email: 'u@test.com', user_type: 'free' }, error: null });

    renderCallback('?token=valid-jwt-token');
    await flushAsync();

    fireEvent.click(screen.getByRole('button', { name: /go to dashboard/i }));
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('shows error when token query param is missing', async () => {
    renderCallback('');
    await flushAsync();

    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText(/invalid or has expired/i)).toBeInTheDocument();
    expect(mockVerify).not.toHaveBeenCalled();
  });

  it('shows error when verifyEmailToken returns an error', async () => {
    mockVerify.mockResolvedValue({ user: null, error: 'Verification link is invalid or has expired.' });

    renderCallback('?token=bad-token');
    await flushAsync();

    expect(screen.getByText('Verification Failed')).toBeInTheDocument();
    expect(screen.getByText('Verification link is invalid or has expired.')).toBeInTheDocument();
  });

  it('navigates to /verify-email when Request New Verification Email is clicked', async () => {
    mockVerify.mockResolvedValue({ user: null, error: 'Expired' });

    renderCallback('?token=bad-token');
    await flushAsync();

    fireEvent.click(screen.getByRole('button', { name: /request new verification email/i }));
    expect(screen.getByText('Verify Email')).toBeInTheDocument();
  });

  it('navigates to /login when Back to Login is clicked on error screen', async () => {
    mockVerify.mockResolvedValue({ user: null, error: 'Expired' });

    renderCallback('?token=bad-token');
    await flushAsync();

    fireEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByText('Login')).toBeInTheDocument();
  });
});
