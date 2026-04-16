import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlanGate } from '../PlanGate';

// Mock usePlanGate
vi.mock('@/app/hooks/usePlanGate', () => ({
  usePlanGate: vi.fn(),
}));

// Mock useNavigate — PlanGate calls it unconditionally at component top level
const mockNavigate = vi.fn();
vi.mock('react-router', async (importOriginal) => {
  const mod = await importOriginal<typeof import('react-router')>();
  return { ...mod, useNavigate: () => mockNavigate };
});

import { usePlanGate } from '@/app/hooks/usePlanGate';
const mockUsePlanGate = vi.mocked(usePlanGate);

describe('PlanGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders children when user has access', () => {
    mockUsePlanGate.mockReturnValue({
      hasAccess: true,
      userPlan: 'professional',
      isAuthenticated: true,
      isProfessional: true,
      isStudio: false,
      isFree: false,
    });

    render(
      <PlanGate plan="professional">
        <div data-testid="protected-content">Secret Content</div>
      </PlanGate>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Now')).not.toBeInTheDocument();
  });

  it('shows upgrade CTA when user lacks access', () => {
    mockUsePlanGate.mockReturnValue({
      hasAccess: false,
      userPlan: 'free',
      isAuthenticated: true,
      isProfessional: false,
      isStudio: false,
      isFree: true,
    });

    render(
      <PlanGate plan="professional">
        <div data-testid="protected-content">Secret Content</div>
      </PlanGate>
    );

    expect(screen.getByText('Upgrade Now')).toBeInTheDocument();
    expect(screen.getByText('Professional Feature')).toBeInTheDocument();
  });

  it('uses custom featureName in upgrade message', () => {
    mockUsePlanGate.mockReturnValue({
      hasAccess: false,
      userPlan: 'free',
      isAuthenticated: true,
      isProfessional: false,
      isStudio: false,
      isFree: true,
    });

    render(
      <PlanGate plan="professional" featureName="What-If Calculator">
        <div>Content</div>
      </PlanGate>
    );

    expect(screen.getByText('What-If Calculator Feature')).toBeInTheDocument();
    expect(screen.getByText(/Upgrade to What-If Calculator/)).toBeInTheDocument();
  });

  it('renders custom fallback instead of default lock UI', () => {
    mockUsePlanGate.mockReturnValue({
      hasAccess: false,
      userPlan: 'free',
      isAuthenticated: true,
      isProfessional: false,
      isStudio: false,
      isFree: true,
    });

    render(
      <PlanGate
        plan="professional"
        fallback={<div data-testid="custom-fallback">Custom Locked</div>}
      >
        <div>Content</div>
      </PlanGate>
    );

    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    expect(screen.queryByText('Upgrade Now')).not.toBeInTheDocument();
  });

  it('shows Studio label for studio plan gate', () => {
    mockUsePlanGate.mockReturnValue({
      hasAccess: false,
      userPlan: 'professional',
      isAuthenticated: true,
      isProfessional: true,
      isStudio: false,
      isFree: false,
    });

    render(
      <PlanGate plan="studio">
        <div>Content</div>
      </PlanGate>
    );

    expect(screen.getByText('Studio Feature')).toBeInTheDocument();
  });
});
