import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { CompanyProfile, StudentProfile, User } from '../types';

export type AuthModalMode = 'login' | 'register' | 'admin';

interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  role: 'mahasiswa' | 'perusahaan';
  university?: string;
  major?: string;
  companyName?: string;
  industry?: string;
  location?: string;
}

interface AuthContextValue {
  user: User | null;
  token: string | null;
  studentProfile: StudentProfile | null;
  companyProfile: CompanyProfile | null;
  unreadNotifications: number;
  isLoading: boolean;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  openAuthModal: (mode?: AuthModalMode) => void;
  closeAuthModal: () => void;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  adminLogin: (payload: { email?: string; password?: string; passcode?: string }) => Promise<User>;
  claimAdmin: (payload: { email: string; fullName: string; password: string }) => Promise<User>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  apiFetch: <T = any>(url: string, options?: RequestInit) => Promise<T>;
  openProtectedFile: (url: string, filename?: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Token kept strictly in React memory (never localStorage or sessionStorage)
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile | null>(null);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');

  const openAuthModal = useCallback((mode: AuthModalMode = 'login') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
  }, []);

  const apiFetch = useCallback(
    async <T = any>(url: string, options: RequestInit = {}, overrideToken?: string): Promise<T> => {
      const headers = new Headers(options.headers || {});
      const activeToken = overrideToken ?? token;
      if (activeToken) {
        headers.set('Authorization', `Bearer ${activeToken}`);
      }
      if (!(options.body instanceof FormData) && !headers.has('Content-Type') && options.body) {
        headers.set('Content-Type', 'application/json');
      }

      const response = await fetch(url, {
        ...options,
        headers,
      });

      const contentType = response.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await response.json() : null;

      if (!response.ok) {
        throw new Error(data?.error || `Terjadi kesalahan (${response.status}).`);
      }

      return data as T;
    },
    [token]
  );

  const loadMe = useCallback(
    async (activeToken: string) => {
      const me = await apiFetch<{
        user: User;
        unreadNotifications: number;
        studentProfile: StudentProfile | null;
        companyProfile: CompanyProfile | null;
      }>('/api/auth/me', {}, activeToken);
      setUser(me.user);
      setUnreadNotifications(me.unreadNotifications);
      setStudentProfile(me.studentProfile);
      setCompanyProfile(me.companyProfile);
    },
    [apiFetch]
  );

  const refreshMe = useCallback(async () => {
    if (!token) return;
    await loadMe(token);
  }, [token, loadMe]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      setStudentProfile(null);
      setCompanyProfile(null);
      setUnreadNotifications(0);
    }
  }, [token]);

  const login = useCallback(
    async (email: string, password: string): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
        setToken(res.token);
        await loadMe(res.token);
        setAuthModalOpen(false);
        return res.user;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, loadMe]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setToken(res.token);
        await loadMe(res.token);
        setAuthModalOpen(false);
        return res.user;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, loadMe]
  );

  const adminLogin = useCallback(
    async (payload: { email?: string; password?: string; passcode?: string }): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/admin-login', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setToken(res.token);
        await loadMe(res.token);
        setAuthModalOpen(false);
        return res.user;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, loadMe]
  );

  const claimAdmin = useCallback(
    async (payload: { email: string; fullName: string; password: string }): Promise<User> => {
      setIsLoading(true);
      try {
        const res = await apiFetch<{ token: string; user: User }>('/api/auth/claim-admin', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setToken(res.token);
        await loadMe(res.token);
        setAuthModalOpen(false);
        return res.user;
      } finally {
        setIsLoading(false);
      }
    },
    [apiFetch, loadMe]
  );

  const logout = useCallback(async () => {
    if (token) {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch {
        // Ignore network errors during logout
      }
    }
    setToken(null);
    setUser(null);
    setStudentProfile(null);
    setCompanyProfile(null);
    setUnreadNotifications(0);
  }, [token, apiFetch]);

  const openProtectedFile = useCallback(
    async (url: string, filename = 'dokumen.pdf') => {
      if (!token) {
        openAuthModal('login');
        return;
      }
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Gagal membuka berkas. Pastikan Anda memiliki akses.');
      }
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 15000);
    },
    [token, openAuthModal]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        studentProfile,
        companyProfile,
        unreadNotifications,
        isLoading,
        authModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
        login,
        register,
        adminLogin,
        claimAdmin,
        logout,
        refreshMe,
        apiFetch,
        openProtectedFile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
