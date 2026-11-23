import React, { useState } from 'react';
import { Bell, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type AppRoute =
  | { name: 'home' }
  | { name: 'search'; initialQuery?: string; initialCategory?: string; initialLocation?: string }
  | { name: 'internship'; id: number }
  | { name: 'companies' }
  | { name: 'company-profile'; slug: string }
  | { name: 'about' }
  | { name: 'dashboard' };

export const Navbar: React.FC<{
  route: AppRoute;
  onNavigate: (r: AppRoute) => void;
}> = ({ route, onNavigate }) => {
  const { user, unreadNotifications, openAuthModal, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navLinkClass = (active: boolean) =>
    `text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer pb-0.5 border-b-2 ${
      active
        ? 'text-[#142B4A] border-[#3B82F6]'
        : 'text-slate-600 border-transparent hover:text-[#142B4A] hover:border-slate-300'
    }`;

  const handleNav = (r: AppRoute) => {
    setMobileOpen(false);
    onNavigate(r);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8 h-16">
        {/* Zone 1: Brand wordmark only */}
        <button
          type="button"
          onClick={() => handleNav({ name: 'home' })}
          className="font-display text-xl font-extrabold tracking-tight text-[#142B4A] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Magang<span className="text-[#3B82F6]">Keren</span>
        </button>

        {/* Zone 2: 4-5 single-line nav links */}
        <nav className="hidden md:flex items-center gap-7" aria-label="Navigasi utama">
          <button
            type="button"
            onClick={() => handleNav({ name: 'home' })}
            className={navLinkClass(route.name === 'home')}
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'search' })}
            className={navLinkClass(route.name === 'search' || route.name === 'internship')}
          >
            Cari Magang
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'companies' })}
            className={navLinkClass(route.name === 'companies' || route.name === 'company-profile')}
          >
            Perusahaan
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'about' })}
            className={navLinkClass(route.name === 'about')}
          >
            Tentang Kami
          </button>
          {user && (
            <button
              type="button"
              onClick={() => handleNav({ name: 'dashboard' })}
              className={navLinkClass(route.name === 'dashboard')}
            >
              Dashboard
            </button>
          )}
        </nav>

        {/* Zone 3: Auth / User Action */}
        <div className="hidden md:flex items-center gap-3 shrink-0">
          {!user ? (
            <>
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-2 text-sm font-semibold text-[#142B4A] hover:text-[#3B82F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="rounded-lg bg-[#142B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1d3d68] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                Daftar
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleNav({ name: 'dashboard' })}
                className="relative flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-medium text-[#142B4A] hover:border-[#3B82F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <span className="max-w-[140px] truncate">{user.fullName}</span>
                {unreadNotifications > 0 && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-semibold text-[#3B82F6] tabular-nums">
                    <Bell className="h-3.5 w-3.5" />
                    {unreadNotifications}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  handleNav({ name: 'home' });
                }}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                title="Keluar"
              >
                <LogOut className="h-4 w-4" />
                <span>Keluar</span>
              </button>
            </div>
          )}
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          className="md:hidden rounded-lg p-2 text-slate-600 hover:bg-slate-100"
          aria-label="Toggle menu navigasi"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleNav({ name: 'home' })}
            className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Beranda
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'search' })}
            className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cari Magang
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'companies' })}
            className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Perusahaan
          </button>
          <button
            type="button"
            onClick={() => handleNav({ name: 'about' })}
            className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Tentang Kami
          </button>
          {user ? (
            <>
              <button
                type="button"
                onClick={() => handleNav({ name: 'dashboard' })}
                className="block w-full text-left rounded-lg px-3 py-2 text-sm font-semibold text-[#142B4A] bg-slate-50"
              >
                Dashboard ({user.fullName})
              </button>
              <button
                type="button"
                onClick={async () => {
                  await logout();
                  handleNav({ name: 'home' });
                }}
                className="block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                Keluar
              </button>
            </>
          ) : (
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('login');
                }}
                className="rounded-lg border border-slate-300 py-2.5 text-sm font-semibold text-[#142B4A]"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openAuthModal('register');
                }}
                className="rounded-lg bg-[#142B4A] py-2.5 text-sm font-semibold text-white"
              >
                Daftar
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
};
