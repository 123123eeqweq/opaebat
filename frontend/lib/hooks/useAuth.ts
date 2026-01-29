/**
 * useAuth hook - manages authentication state
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { authApi } from '../api/client';

interface User {
  id: string;
  email: string;
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const checkAuth = useCallback(async () => {
    try {
      const response = await authApi.me();
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
    } catch (error) {
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Login failed',
      };
    }
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    try {
      const response = await authApi.register(email, password);
      setState({
        user: response.user,
        isLoading: false,
        isAuthenticated: true,
      });
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.data?.message || error.message || 'Registration failed',
      };
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    } catch (error) {
      // Even if logout fails, clear local state
      setState({
        user: null,
        isLoading: false,
        isAuthenticated: false,
      });
    }
  }, []);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    ...state,
    login,
    register,
    logout,
    checkAuth,
  };
}
