import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router';

vi.mock('@/services/auth.service', () => ({
  authService: {
    resendVerification: vi.fn(),
  },
}));

vi.mock('@/assets/2ac5b205356b38916f5ff32008dfa103d8ffc2cb.png', () => ({
  default: 'logo.png',
}));

import { authService } from '@/services/auth.service';
import { VerifyEmail } from '../VerifyEmail';

const mockResend = vi.mocked(authService.resendVerification);

function renderVerifyEmail(email?: string) {
  const state = email ? { email } : undefined;
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/verify-email', state }]}>
      <Routes>
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/" element={<div>Home</div>} />
      </Routes>
    </MemoryRouter>
  );
}

// Advance the 60-tick countdown inside fake timers.
async function advanceCountdown(ticks = 61) {
  for (let i = 0; i < ticks; i++) {
    await act(async () => { vi.advanceTimersByTime(1000); });
  }
}

// Flush all pending promises and React state updates.
const flushAsync = () => act(async () => {});

describe('VerifyEmail — display', () => {
  it('displays the email passed via location state', () => {
    renderVerifyEmail('jane@example.com');
    expect(screen.getByText('jane@example.com')).toBeInTheDocument();
  });

  it('falls back to "your email" when no state is provided', () => {
    renderVerifyEmail();
    expect(screen.getByText('your email')).toBeInTheDocument();
  });

  it('renders the resend button disabled with countdown initially', () => {
    renderVerifyEmail('user@test.com');
    expect(screen.getByRole('button', { name: /resend in 60s/i })).toBeDisabled();
  });
});

describe('VerifyEmail — countdown & resend', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('enables resend button after 60s countdown', async () => {
    renderVerifyEmail('user@test.com');
    await advanceCountdown();
    expect(screen.getByRole('button', { name: /resend verification email/i })).toBeEnabled();
  });

  it('calls resendVerification with the correct email when resend is clicked', async () => {
    mockResend.mockResolvedValue({ error: null });
    renderVerifyEmail('user@test.com');

    await advanceCountdown();
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await flushAsync();

    expect(mockResend).toHaveBeenCalledWith('user@test.com');
  });

  it('shows success alert after a successful resend', async () => {
    mockResend.mockResolvedValue({ error: null });
    renderVerifyEmail('user@test.com');

    await advanceCountdown();
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await flushAsync();

    expect(screen.getByText(/verification email sent/i)).toBeInTheDocument();
  });

  it('resets countdown to 60s and disables button after a successful resend', async () => {
    mockResend.mockResolvedValue({ error: null });
    renderVerifyEmail('user@test.com');

    await advanceCountdown();
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await flushAsync();

    expect(screen.getByRole('button', { name: /resend in 60s/i })).toBeDisabled();
  });

  it('shows error alert when resend fails', async () => {
    mockResend.mockResolvedValue({ error: 'Email not found' });
    renderVerifyEmail('user@test.com');

    await advanceCountdown();
    fireEvent.click(screen.getByRole('button', { name: /resend verification email/i }));
    await flushAsync();

    expect(screen.getByText('Email not found')).toBeInTheDocument();
  });
});

describe('VerifyEmail — navigation', () => {
  it('navigates to /login when Back to Login is clicked', async () => {
    renderVerifyEmail('user@test.com');
    await userEvent.click(screen.getByRole('button', { name: /back to login/i }));
    expect(screen.getByText('Login')).toBeInTheDocument();
  });

  it('navigates to / when Home is clicked', async () => {
    renderVerifyEmail('user@test.com');
    await userEvent.click(screen.getByRole('button', { name: /^home$/i }));
    expect(screen.getByText('Home')).toBeInTheDocument();
  });
});
