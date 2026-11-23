import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar, type AppRoute } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { LandingPage } from './pages/LandingPage';
import { SearchInternshipsPage } from './pages/SearchInternshipsPage';
import { InternshipDetailPage } from './pages/InternshipDetailPage';
import {
  AboutPage,
  CompaniesPage,
  CompanyPublicProfilePage,
} from './pages/CompaniesPages';
import { StudentDashboardPage } from './pages/StudentDashboardPage';
import { CompanyDashboardPage } from './pages/CompanyDashboardPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';

const AppShell: React.FC = () => {
  const { user, openAuthModal } = useAuth();
  const [route, setRoute] = useState<AppRoute>({ name: 'home' });

  const navigate = (nextRoute: AppRoute) => {
    setRoute(nextRoute);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderDashboard = () => {
    if (!user) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <div className="rounded-xl border border-slate-200 bg-white p-10">
            <h1 className="font-display text-2xl font-bold text-[#142B4A]">
              Masuk untuk Mengakses Dashboard
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Silakan masuk atau buat akun Mahasiswa maupun Perusahaan untuk mengelola profil, lamaran, dan lowongan magang.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => openAuthModal('login')}
                className="rounded-lg bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white cursor-pointer"
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => openAuthModal('register')}
                className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-[#142B4A] cursor-pointer"
              >
                Daftar Akun
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (user.role === 'mahasiswa') {
      return <StudentDashboardPage onNavigate={navigate} />;
    }
    if (user.role === 'perusahaan') {
      return <CompanyDashboardPage onNavigate={navigate} />;
    }
    return <AdminDashboardPage />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#1E293B]">
      <Navbar route={route} onNavigate={navigate} />

      <div className="flex-1">
        {route.name === 'home' && <LandingPage onNavigate={navigate} />}
        {route.name === 'search' && (
          <SearchInternshipsPage
            initialQuery={route.initialQuery}
            initialCategory={route.initialCategory}
            initialLocation={route.initialLocation}
            onNavigate={navigate}
          />
        )}
        {route.name === 'internship' && (
          <InternshipDetailPage internshipId={route.id} onNavigate={navigate} />
        )}
        {route.name === 'companies' && <CompaniesPage onNavigate={navigate} />}
        {route.name === 'company-profile' && (
          <CompanyPublicProfilePage slug={route.slug} onNavigate={navigate} />
        )}
        {route.name === 'about' && <AboutPage onNavigate={navigate} />}
        {route.name === 'dashboard' && renderDashboard()}
      </div>

      <Footer onNavigate={navigate} />

      <AuthModal
        onSuccessRedirect={() => {
          navigate({ name: 'dashboard' });
        }}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
