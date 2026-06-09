import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router';
import { ProtectedRoute } from '../ProtectedRoute';

// Mock hooks
vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/app/hooks/usePlanGate', () => ({
  usePlanGate: vi.fn(),
}));

import { useAuth } from '@/app/contexts/AuthContext';
import { usePlanGate } from '@/app/hooks/usePlanGate';
const mockUseAuth = vi.mocked(useAuth);
const mockUsePlanGate = vi.mocked(usePlanGate);

function renderRoute(
  path: string,
  element: React.ReactElement,
  initialEntry = '/'
) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path={path} element={element} />
        <Route path="/login" element={<div>Login Page</div>} />
        <Route path="/pricing" element={<div>Pricing Page</div>} />
      </Routes>
    </MemoryRouter>
  );
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children for authenticated user with sufficient plan', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true } as any);
    mockUsePlanGate.mockReturnValue({ hasAccess: true } as any);

    renderRoute(
      '/tools/what-if',
      <ProtectedRoute plan="professional">
        <div data-testid="content">What If Calculator</div>
      </ProtectedRoute>,
      '/tools/what-if'
    );

    expect(screen.getByTestId('content')).toBeInTheDocument();
  });

  it('redirects to /login when not authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: false } as any);
    mockUsePlanGate.mockReturnValue({ hasAccess: false } as any);

    renderRoute(
      '/tools/what-if',
      <ProtectedRoute plan="professional">
        <div>What If Calculator</div>
      </ProtectedRoute>,
      '/tools/what-if'
    );

    expect(screen.getByText('Login Page')).toBeInTheDocument();
  });

  it('redirects to /pricing when authenticated but plan too low', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true } as any);
    mockUsePlanGate.mockReturnValue({ hasAccess: false } as any);

    renderRoute(
      '/tools/what-if',
      <ProtectedRoute plan="professional">
        <div>What If Calculator</div>
      </ProtectedRoute>,
      '/tools/what-if'
    );

    expect(screen.getByText('Pricing Page')).toBeInTheDocument();
  });

  it('renders children when no plan required and user is authenticated', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true } as any);
    mockUsePlanGate.mockReturnValue({ hasAccess: true } as any);

    renderRoute(
      '/dashboard',
      <ProtectedRoute>
        <div data-testid="dashboard">Dashboard</div>
      </ProtectedRoute>,
      '/dashboard'
    );

    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
  });

  it('does not redirect for plan check when no plan prop given', () => {
    mockUseAuth.mockReturnValue({ isAuthenticated: true } as any);
    mockUsePlanGate.mockReturnValue({ hasAccess: false } as any);

    renderRoute(
      '/dashboard',
      <ProtectedRoute>
        <div data-testid="dashboard">Dashboard</div>
      </ProtectedRoute>,
      '/dashboard'
    );

    // No plan prop → no plan redirect
    expect(screen.getByTestId('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('Pricing Page')).not.toBeInTheDocument();
  });
});
