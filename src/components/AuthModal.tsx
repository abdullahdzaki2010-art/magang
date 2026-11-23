import React, { useEffect, useState } from 'react';
import { X, Shield, UserCheck, Building2, GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const AuthModal: React.FC<{ onSuccessRedirect?: (role: string) => void }> = ({
  onSuccessRedirect,
}) => {
  const {
    authModalOpen,
    authModalMode,
    openAuthModal,
    closeAuthModal,
    login,
    register,
    adminLogin,
    claimAdmin,
    isLoading,
  } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'mahasiswa' | 'perusahaan'>('mahasiswa');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('Teknologi & Digital');
  const [location, setLocation] = useState('Jakarta');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [adminStatus, setAdminStatus] = useState<{
    adminExists: boolean;
    envPasscodeConfigured: boolean;
  } | null>(null);

  useEffect(() => {
    setError(null);
    if (authModalOpen && authModalMode === 'admin') {
      fetch('/api/auth/admin-status')
        .then((r) => r.json())
        .then((data) => setAdminStatus(data))
        .catch(() => setAdminStatus({ adminExists: false, envPasscodeConfigured: false }));
    }
  }, [authModalOpen, authModalMode]);

  if (!authModalOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const loggedUser = await login(email, password);
      onSuccessRedirect?.(loggedUser.role);
    } catch (err: any) {
      setError(err.message || 'Gagal masuk.');
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      const registeredUser = await register({
        email,
        password,
        fullName,
        role,
        university,
        major,
        companyName,
        industry,
        location,
      });
      onSuccessRedirect?.(registeredUser.role);
    } catch (err: any) {
      setError(err.message || 'Gagal mendaftar.');
    }
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      if (adminStatus && !adminStatus.adminExists && !adminStatus.envPasscodeConfigured) {
        const claimed = await claimAdmin({ email, fullName, password });
        onSuccessRedirect?.(claimed.role);
      } else {
        const loggedAdmin = await adminLogin({ email, password, passcode });
        onSuccessRedirect?.(loggedAdmin.role);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal autentikasi Admin.');
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('MagangKeren2026!');
    setError(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <h2 id="auth-modal-title" className="text-lg font-bold text-[#142B4A]">
              {authModalMode === 'login' && 'Masuk ke MagangKeren'}
              {authModalMode === 'register' && 'Daftar Akun Baru'}
              {authModalMode === 'admin' && 'Konsol Administrator'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {authModalMode === 'login' && 'Akses dashboard mahasiswa atau rekrutmen perusahaan'}
              {authModalMode === 'register' && 'Mulai perjalanan magang atau temukan talenta muda'}
              {authModalMode === 'admin' && 'Otentikasi khusus pengelola platform MagangKeren'}
            </p>
          </div>
          <button
            type="button"
            onClick={closeAuthModal}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Tutup modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2">
          <button
            type="button"
            onClick={() => openAuthModal('login')}
            className={`py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authModalMode === 'login'
                ? 'border-[#142B4A] text-[#142B4A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Masuk
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('register')}
            className={`py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authModalMode === 'register'
                ? 'border-[#142B4A] text-[#142B4A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Daftar
          </button>
          <button
            type="button"
            onClick={() => openAuthModal('admin')}
            className={`py-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap ${
              authModalMode === 'admin'
                ? 'border-[#142B4A] text-[#142B4A]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Admin
          </button>
        </div>

        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {error && (
            <div className="mb-4 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
              {error}
            </div>
          )}

          {authModalMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@kampus.ac.id"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#142B4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}
              </button>

              <div className="border-t border-slate-200 pt-4 mt-4">
                <p className="text-xs font-medium text-slate-500 mb-2">Akses cepat akun demo pratinjau:</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemo('nadia.putri@ui.ac.id')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-[#3B82F6] hover:text-[#142B4A] transition-colors cursor-pointer"
                  >
                    <GraduationCap className="h-3.5 w-3.5 text-[#3B82F6]" />
                    <span>Mahasiswa Demo</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemo('hr@finpay.id')}
                    className="flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700 hover:border-[#3B82F6] hover:text-[#142B4A] transition-colors cursor-pointer"
                  >
                    <Building2 className="h-3.5 w-3.5 text-[#142B4A]" />
                    <span>Perusahaan Demo</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {authModalMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Daftar Sebagai</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setRole('mahasiswa')}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      role === 'mahasiswa'
                        ? 'bg-white text-[#142B4A] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Mahasiswa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('perusahaan')}
                    className={`flex items-center justify-center gap-1.5 rounded-md py-2 text-xs font-semibold transition-colors cursor-pointer ${
                      role === 'perusahaan'
                        ? 'bg-white text-[#142B4A] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>Perusahaan</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {role === 'mahasiswa' ? 'Nama Lengkap' : 'Nama Penanggung Jawab (HR/PIC)'}
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={role === 'mahasiswa' ? 'Contoh: Rizky Ramadhan' : 'Contoh: Sari Dewi'}
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]/20"
                />
              </div>

              {role === 'mahasiswa' ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Perguruan Tinggi</label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="Universitas / Politeknik"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jurusan</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="Teknik Informatika"
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Perusahaan</label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="PT Teknologi Nusantara"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industri</label>
                      <input
                        type="text"
                        value={industry}
                        onChange={(e) => setIndustry(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi Kantor</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                      />
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Alamat Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@domain.com"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi (min. 6 karakter)</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Buat kata sandi yang aman"
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#142B4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isLoading ? 'Mendaftarkan...' : 'Buat Akun Sekarang'}
              </button>
            </form>
          )}

          {authModalMode === 'admin' && (
            <form onSubmit={handleAdminSubmit} className="space-y-4">
              {adminStatus?.envPasscodeConfigured ? (
                <div>
                  <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
                    <Shield className="h-4 w-4 text-[#142B4A] shrink-0 mt-0.5" />
                    <span>Passcode administrator server aktif. Masukkan passcode untuk membuka Dashboard Admin.</span>
                  </div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Passcode Administrator</label>
                  <input
                    type="password"
                    required
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value)}
                    placeholder="Masukkan passcode server"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                  />
                </div>
              ) : adminStatus && !adminStatus.adminExists ? (
                <>
                  <div className="rounded-lg border border-blue-200 bg-blue-50/70 p-3 text-xs text-[#142B4A] flex items-start gap-2">
                    <UserCheck className="h-4 w-4 text-[#3B82F6] shrink-0 mt-0.5" />
                    <span>
                      Belum ada akun Administrator terdaftar. Klaim akun Admin utama platform sekarang (hanya dapat dilakukan sekali).
                    </span>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap Admin</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Administrator Utama"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Admin</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@magangkeren.id"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi Admin (min. 8 karakter)</label>
                    <input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimal 8 karakter"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Administrator</label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@magangkeren.id"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kata Sandi</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Kata sandi admin"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg bg-[#142B4A] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 transition-colors cursor-pointer"
              >
                {isLoading
                  ? 'Memproses...'
                  : adminStatus && !adminStatus.adminExists && !adminStatus.envPasscodeConfigured
                  ? 'Aktifkan Akun Admin Pertama'
                  : 'Masuk sebagai Admin'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
