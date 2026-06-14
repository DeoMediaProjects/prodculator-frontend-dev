import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock Firebase so importing the service never initialises a real app.
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn() }));
vi.mock('@/lib/firebase', () => ({ auth: {}, googleProvider: {} }));

// Mock the API layer — no real HTTP, and we can assert on session-state effects.
vi.mock('../api', () => ({
  apiClient: { post: vi.fn(), get: vi.fn() },
  markAuthenticated: vi.fn(),
  markAdminAuthenticated: vi.fn(),
  clearAuthState: vi.fn(),
  isAuthenticated: vi.fn(),
  isAdminSession: vi.fn(),
  subscribeAuthState: vi.fn(),
}));

import { authService } from '../auth.service';
import { apiClient, markAuthenticated, clearAuthState, isAuthenticated } from '../api';

const mockPost = vi.mocked(apiClient.post);
const mockGet = vi.mocked(apiClient.get);
const mockMarkAuth = vi.mocked(markAuthenticated);
const mockClearAuth = vi.mocked(clearAuthState);
const mockIsAuth = vi.mocked(isAuthenticated);

const sampleUser = { id: 'u1', email: 'a@b.com', user_type: 'free' };
const tokenResponse = {
  access_token: 'x',
  refresh_token: 'y',
  token_type: 'bearer',
  expires_in: 3600,
  user: sampleUser,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('AuthService.signIn', () => {
  it('returns the user and marks the session authenticated on success', async () => {
    mockPost.mockResolvedValueOnce(tokenResponse);
    const res = await authService.signIn('a@b.com', 'pw');
    expect(res.user).toEqual(sampleUser);
    expect(res.error).toBeNull();
    expect(mockMarkAuth).toHaveBeenCalledOnce();
    expect(mockPost).toHaveBeenCalledWith('/api/auth/signin', { email: 'a@b.com', password: 'pw' });
  });

  it('surfaces the error and does not mark auth on failure', async () => {
    mockPost.mockRejectedValueOnce(new Error('Invalid email or password'));
    const res = await authService.signIn('a@b.com', 'wrong');
    expect(res.user).toBeNull();
    expect(res.error).toBe('Invalid email or password');
    expect(mockMarkAuth).not.toHaveBeenCalled();
  });
});

describe('AuthService.signUp', () => {
  it('flags verificationRequired when the backend defers token issue', async () => {
    mockPost.mockResolvedValueOnce({ verification_required: true, email: 'a@b.com' });
    const res = await authService.signUp('a@b.com', 'pw');
    expect(res.verificationRequired).toBe(true);
    expect(res.user).toBeNull();
    expect(res.error).toBeNull();
    expect(mockMarkAuth).not.toHaveBeenCalled();
  });

  it('returns the user and marks auth when tokens are issued immediately', async () => {
    mockPost.mockResolvedValueOnce(tokenResponse);
    const res = await authService.signUp('a@b.com', 'pw');
    expect(res.user).toEqual(sampleUser);
    expect(res.verificationRequired).toBe(false);
    expect(mockMarkAuth).toHaveBeenCalledOnce();
  });
});

describe('AuthService.signOut', () => {
  it('clears local auth state on success', async () => {
    mockPost.mockResolvedValueOnce(undefined);
    const res = await authService.signOut();
    expect(mockClearAuth).toHaveBeenCalledOnce();
    expect(res.error).toBeNull();
  });

  it('clears local auth state even if the backend call fails', async () => {
    mockPost.mockRejectedValueOnce(new Error('network'));
    const res = await authService.signOut();
    expect(mockClearAuth).toHaveBeenCalledOnce();
    expect(res.error).toBe('network');
  });
});

describe('AuthService.getCurrentUser', () => {
  it('returns null and makes no request when there is no session', async () => {
    mockIsAuth.mockReturnValue(false);
    const res = await authService.getCurrentUser();
    expect(res).toBeNull();
    expect(mockGet).not.toHaveBeenCalled();
  });

  it('fetches /api/auth/me when a session exists', async () => {
    mockIsAuth.mockReturnValue(true);
    mockGet.mockResolvedValueOnce(sampleUser);
    const res = await authService.getCurrentUser();
    expect(res).toEqual(sampleUser);
    expect(mockGet).toHaveBeenCalledWith('/api/auth/me', { auth: true });
  });
});
