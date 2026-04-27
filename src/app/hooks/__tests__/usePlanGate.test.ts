import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlanGate } from '../usePlanGate';

// Mock the AuthContext
vi.mock('@/app/contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

import { useAuth } from '@/app/contexts/AuthContext';
const mockUseAuth = vi.mocked(useAuth);

function mockUser(plan: string) {
  mockUseAuth.mockReturnValue({
    user: { plan } as any,
    isAuthenticated: true,
  } as any);
}

describe('usePlanGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Basic access gates ───────────────────────────────────────────────────

  it('grants access when user plan meets required level', () => {
    mockUser('professional');
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('denies access when user plan is below required level', () => {
    mockUser('free');
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(false);
  });

  it('treats legacy "single" as professional level', () => {
    mockUser('single');
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(true);
  });

  // ── Producer tier ────────────────────────────────────────────────────────

  it('producer user has access to professional features', () => {
    mockUser('producer');
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('producer user has access to producer features', () => {
    mockUser('producer');
    const { result } = renderHook(() => usePlanGate('producer'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('professional user cannot access producer features', () => {
    mockUser('professional');
    const { result } = renderHook(() => usePlanGate('producer'));
    expect(result.current.hasAccess).toBe(false);
  });

  it('producer user cannot access studio features', () => {
    mockUser('producer');
    const { result } = renderHook(() => usePlanGate('studio'));
    expect(result.current.hasAccess).toBe(false);
  });

  // ── Studio tier ──────────────────────────────────────────────────────────

  it('studio user has access to professional features', () => {
    mockUser('studio');
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('studio user has access to producer features', () => {
    mockUser('studio');
    const { result } = renderHook(() => usePlanGate('producer'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('studio user has access to studio features', () => {
    mockUser('studio');
    const { result } = renderHook(() => usePlanGate('studio'));
    expect(result.current.hasAccess).toBe(true);
  });

  it('professional user cannot access studio features', () => {
    mockUser('professional');
    const { result } = renderHook(() => usePlanGate('studio'));
    expect(result.current.hasAccess).toBe(false);
  });

  // ── Boolean flags ────────────────────────────────────────────────────────

  it('returns correct boolean flags for free user', () => {
    mockUser('free');
    const { result } = renderHook(() => usePlanGate());
    expect(result.current.isFree).toBe(true);
    expect(result.current.isProfessional).toBe(false);
    expect(result.current.isProducer).toBe(false);
    expect(result.current.isStudio).toBe(false);
    expect(result.current.userPlan).toBe('free');
  });

  it('returns correct boolean flags for professional user', () => {
    mockUser('professional');
    const { result } = renderHook(() => usePlanGate());
    expect(result.current.isFree).toBe(false);
    expect(result.current.isProfessional).toBe(true);
    expect(result.current.isProducer).toBe(false);
    expect(result.current.isStudio).toBe(false);
    expect(result.current.userPlan).toBe('professional');
  });

  it('returns correct boolean flags for producer user', () => {
    mockUser('producer');
    const { result } = renderHook(() => usePlanGate());
    expect(result.current.isFree).toBe(false);
    expect(result.current.isProfessional).toBe(true);
    expect(result.current.isProducer).toBe(true);
    expect(result.current.isStudio).toBe(false);
    expect(result.current.userPlan).toBe('producer');
  });

  it('returns correct boolean flags for studio user', () => {
    mockUser('studio');
    const { result } = renderHook(() => usePlanGate());
    expect(result.current.isFree).toBe(false);
    expect(result.current.isProfessional).toBe(true);
    expect(result.current.isProducer).toBe(true);
    expect(result.current.isStudio).toBe(true);
    expect(result.current.userPlan).toBe('studio');
  });

  // ── Edge cases ───────────────────────────────────────────────────────────

  it('defaults to free when user is null', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    } as any);
    const { result } = renderHook(() => usePlanGate('professional'));
    expect(result.current.hasAccess).toBe(false);
    expect(result.current.isFree).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('defaults required plan to professional', () => {
    mockUser('free');
    const { result } = renderHook(() => usePlanGate());
    expect(result.current.hasAccess).toBe(false);
  });

  it('free user passes free gate', () => {
    mockUser('free');
    const { result } = renderHook(() => usePlanGate('free'));
    expect(result.current.hasAccess).toBe(true);
  });
});
