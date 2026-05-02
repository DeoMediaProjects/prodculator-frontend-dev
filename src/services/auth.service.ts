/**
 * Backend Authentication Service
 * Frontend auth flows routed through FastAPI backend.
 */

import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import {
  apiClient,
  clearTokens,
  getAccessToken,
  getRefreshToken,
  isAdminSession,
  setTokens,
  setTokensSilent,
  subscribeAuthState,
} from './api';

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role?: string;
  user_type: 'free' | 'paid' | 'b2b' | 'admin';
  credits_remaining?: number;
  plan?: 'free' | 'single' | 'professional' | 'producer' | 'studio';
  email_verified?: boolean;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: AuthUser;
}

interface SignUpResponse {
  verification_required: true;
  email: string;
}

export class AuthService {
  async signUp(
    email: string,
    password: string,
    metadata?: {
      name?: string;
      company?: string;
      role?: string;
    }
  ): Promise<{ user: AuthUser | null; verificationRequired: boolean; error: string | null }> {
    try {
      const data = await apiClient.post<TokenResponse | SignUpResponse>('/api/auth/signup', {
        email,
        password,
        name: metadata?.name,
        company: metadata?.company,
        role: metadata?.role,
      });

      if ('verification_required' in data && data.verification_required) {
        return { user: null, verificationRequired: true, error: null };
      }

      const tokens = data as TokenResponse;
      setTokens(tokens.access_token, tokens.refresh_token);
      return { user: tokens.user, verificationRequired: false, error: null };
    } catch (error) {
      return { user: null, verificationRequired: false, error: error instanceof Error ? error.message : 'Sign up failed' };
    }
  }

  async verifyEmailToken(token: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const data = await apiClient.post<TokenResponse>('/api/auth/verify-email', { token });
      setTokens(data.access_token, data.refresh_token);
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Verification failed' };
    }
  }

  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const data = await apiClient.post<TokenResponse>('/api/auth/signin', { email, password });
      setTokens(data.access_token, data.refresh_token);
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Sign in failed' };
    }
  }

  async signOut(): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/auth/signout', undefined, { auth: true });
      clearTokens();
      return { error: null };
    } catch (error) {
      clearTokens();
      return { error: error instanceof Error ? error.message : 'Sign out failed' };
    }
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const token = getAccessToken();
      if (!token) {
        return null;
      }
      return await apiClient.get<AuthUser>('/api/auth/me', { auth: true });
    } catch (_error) {
      return null;
    }
  }

  async resetPassword(email: string): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/auth/reset-password', { email });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Reset password failed' };
    }
  }

  async resendVerification(email: string): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/auth/resend-verification', { email });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Resend verification failed' };
    }
  }

  async updatePassword(newPassword: string): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/auth/update-password', { new_password: newPassword }, { auth: true });
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Update password failed' };
    }
  }

  async refreshSession(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        return { user: null, error: 'No refresh token available' };
      }

      const data = await apiClient.post<TokenResponse>('/api/auth/refresh', {
        refresh_token: refreshToken,
      });
      setTokens(data.access_token, data.refresh_token);
      return { user: data.user, error: null };
    } catch (error) {
      clearTokens();
      return { user: null, error: error instanceof Error ? error.message : 'Token refresh failed' };
    }
  }

  async signInWithGoogle(): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      // Step 1: Firebase handles the Google OAuth popup
      const result = await signInWithPopup(auth, googleProvider);

      // Step 2: Get the short-lived Firebase ID token
      const idToken = await result.user.getIdToken();

      // Step 3: Exchange the Firebase ID token for backend JWT
      const response = await fetch(`${apiClient.baseUrl}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_token: idToken }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        const detail =
          typeof err?.detail === 'string'
            ? err.detail
            : JSON.stringify(err?.detail ?? err ?? response.statusText);
        throw new Error(detail);
      }

      const data: TokenResponse = await response.json();

      // Step 4: Store backend JWT
      setTokens(data.access_token, data.refresh_token);
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Google sign-in failed' };
    }
  }

  async adminSignIn(email: string, password: string): Promise<{ user: AuthUser | null; error: string | null }> {
    try {
      const data = await apiClient.post<TokenResponse>('/api/admin/auth/signin', { email, password });
      // Use silent setter: stores tokens without emitting a regular auth-state
      // change, so the onAuthStateChange listener won't call /api/auth/me with
      // an admin token and produce spurious 401s.
      setTokensSilent(data.access_token, data.refresh_token);
      return { user: data.user, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Admin sign in failed' };
    }
  }

  async adminSignOut(): Promise<{ error: string | null }> {
    try {
      await apiClient.post('/api/admin/auth/signout', undefined, { auth: true });
      clearTokens();
      return { error: null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Admin sign out failed' };
    }
  }

  async getAdminUser(): Promise<AuthUser | null> {
    try {
      const token = getAccessToken();
      if (!token || !isAdminSession()) return null;
      return await apiClient.get<AuthUser>('/api/admin/auth/me', { auth: true });
    } catch (_error) {
      return null;
    }
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void) {
    const unsubscribe = subscribeAuthState(async (authenticated) => {
      if (!authenticated) {
        callback(null);
        return;
      }
      const user = await this.getCurrentUser();
      callback(user);
    });

    return {
      data: {
        subscription: {
          unsubscribe,
        },
      },
    };
  }
}

export const authService = new AuthService();
