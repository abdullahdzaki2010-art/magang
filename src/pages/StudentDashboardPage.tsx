import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Briefcase,
  Bookmark,
  UserCircle,
  Bell,
  Upload,
  FileText,
  CalendarClock,
  ExternalLink,
  Plus,
  Trash2,
  CheckCheck,
  Download,
} from 'lucide-react';
import type {
  Application,
  Internship,
  NotificationItem,
  OrganizationExperience,
  StudentProfile,
} from '../types';
import type { AppRoute } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import { InternshipCard } from '../components/InternshipCard';
import { ApplicationStatusLabel, formatIndonesianDate } from '../components/StatusIndicator';
import { CompanyAvatar } from '../components/CompanyAvatar';

interface StudentDashboardData {
  profile: StudentProfile;
  stats: {
    total: number;
    menunggu_review: number;
    diproses: number;
    interview: number;
    diterima: number;
    ditolak: number;
  };
  applications: Application[];
  savedJobs: Internship[];
  recommendations: Internship[];
  notifications: NotificationItem[];
}

type StudentTab = 'overview' | 'applications' | 'saved' | 'profile' | 'notifications';

export const StudentDashboardPage: React.FC<{ onNavigate: (r: AppRoute) => void }> = ({
  onNavigate,
}) => {
  const { apiFetch, refreshMe, openProtectedFile } = useAuth();
  const [tab, setTab] = useState<StudentTab>('overview');
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [major, setMajor] = useState('');
  const [semester, setSemester] = useState(6);
  const [gpa, setGpa] = useState('');
  const [phone, setPhone] = useState('');
  const [location, setLocation] = useState('');
  const [bio, setBio] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState('');
  const [organizations, setOrganizations] = useState<OrganizationExperience[]>([]);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileNotice, setProfileNotice] = useState<string | null>(null);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<StudentDashboardData>('/api/student/dashboard');
      setData(res);
      setFullName(res.profile.fullName);
      setUniversity(res.profile.university);
      setMajor(res.profile.major);
      setSemester(res.profile.semester);
      setGpa(res.profile.gpa);
      setPhone(res.profile.phone);
      setLocation(res.profile.location);
      setBio(res.profile.bio);
      setPortfolioUrl(res.profile.portfolioUrl || '');
      setSkills(res.profile.skills);
      setOrganizations(res.profile.organizations);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat dashboard mahasiswa.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleToggleSave = async (internshipId: number) => {
    try {
      await apiFetch(`/api/internships/${internshipId}/save`, { method: 'POST' });
      await loadDashboard();
    } catch {
      // Ignore
    }
  };

  const handleMarkRead = async (notifId: number) => {
    try {
      await apiFetch(`/api/notifications/${notifId}/read`, { method: 'PATCH' });
      await Promise.all([loadDashboard(), refreshMe()]);
    } catch {
      // Ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await apiFetch('/api/notifications/read-all', { method: 'POST' });
      await Promise.all([loadDashboard(), refreshMe()]);
    } catch {
      // Ignore
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileNotice(null);
    try {
      await apiFetch('/api/student/profile', {
        method: 'PUT',
        body: JSON.stringify({
          fullName,
          university,
          major,
          semester,
          gpa,
          phone,
          location,
          bio,
          skills,
          organizations,
          portfolioUrl,
        }),
      });
      await Promise.all([loadDashboard(), refreshMe()]);
      setProfileNotice('Profil mahasiswa berhasil disimpan.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Gagal menyimpan profil.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUploadCv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingCv(true);
    setProfileNotice(null);
    try {
      const fd = new FormData();
      fd.append('cv', file);
      await apiFetch('/api/student/upload-cv', { method: 'POST', body: fd });
      await Promise.all([loadDashboard(), refreshMe()]);
      setProfileNotice('Berkas CV PDF berhasil diunggah.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Gagal mengunggah CV PDF.');
    } finally {
      setUploadingCv(false);
    }
  };

  const handleUploadPortfolio = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPortfolio(true);
    setProfileNotice(null);
    try {
      const fd = new FormData();
      fd.append('portfolio', file);
      await apiFetch('/api/student/upload-portfolio', { method: 'POST', body: fd });
      await Promise.all([loadDashboard(), refreshMe()]);
      setProfileNotice('Berkas portofolio berhasil diunggah.');
    } catch (err: any) {
      setProfileNotice(err.message || 'Gagal mengunggah portofolio.');
    } finally {
      setUploadingPortfolio(false);
    }
  };

  const addSkill = () => {
    const trimmed = newSkill.trim();
    if (!trimmed || skills.includes(trimmed)) return;
    setSkills([...skills, trimmed]);
    setNewSkill('');
  };

  const addOrganization = () => {
    setOrganizations([
      ...organizations,
      { name: '', role: '', period: '', description: '' },
    ]);
  };

  const profileCompleteness = data
    ? Math.round(
        ([
          Boolean(data.profile.university),
          Boolean(data.profile.major),
          Boolean(data.profile.bio),
          data.profile.skills.length > 0,
          Boolean(data.profile.cvFilename),
          Boolean(data.profile.portfolioUrl || data.profile.portfolioFilename),
        ].filter(Boolean).length /
          6) *
          100
      )
    : 0;

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
          <p className="text-sm text-rose-700">{error || 'Gagal memuat data.'}</p>
          <button
            type="button"
            onClick={loadDashboard}
            className="mt-3 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Muat Ulang
          </button>
        </div>
      </div>
    );
  }

  const unreadCount = data.notifications.filter((n) => !n.isRead).length;

  const navItems: Array<{ id: StudentTab; label: string; Icon: any; count?: number }> = [
    { id: 'overview', label: 'Ringkasan', Icon: LayoutDashboard },
    { id: 'applications', label: 'Riwayat Lamaran', Icon: Briefcase, count: data.stats.total },
    { id: 'saved', label: 'Lowongan Disimpan', Icon: Bookmark, count: data.savedJobs.length },
    { id: 'profile', label: 'Profil & Berkas', Icon: UserCircle },
    { id: 'notifications', label: 'Notifikasi', Icon: Bell, count: unreadCount || undefined },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="px-3 py-3 border-b border-slate-100 mb-2">
              <p className="font-display text-sm font-bold text-[#142B4A] truncate">{data.profile.fullName}</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">
                {data.profile.university || 'Lengkapi nama kampus'}
              </p>
            </div>

            {navItems.map((item) => {
              const Icon = item.Icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setTab(item.id)}
                  className={`w-full flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-medium transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#142B4A] text-white'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-[#142B4A]'
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </span>
                  {typeof item.count === 'number' && item.count > 0 && (
                    <span
                      className={`text-xs font-mono tabular-nums ${
                        active ? 'text-blue-200' : 'text-slate-500'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Viewport */}
        <main className="flex-1 min-w-0 space-y-6">
          {tab === 'overview' && (
            <>
              {/* Profile Summary Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <p className="text-xs font-semibold text-[#3B82F6]">Dashboard Mahasiswa</p>
                  <h1 className="mt-1 font-display text-2xl font-bold text-[#142B4A]">
                    Halo, {data.profile.fullName}
                  </h1>
                  <p className="mt-1 text-sm text-slate-600">
                    {data.profile.major || 'Jurusan belum diisi'} · {data.profile.university || 'Universitas belum diisi'} · Semester{' '}
                    <span className="tabular-nums">{data.profile.semester}</span>
                  </p>
                </div>

                <div className="md:w-64 shrink-0">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-1.5">
                    <span>Kelengkapan Profil</span>
                    <span className="font-mono tabular-nums text-[#142B4A]">{profileCompleteness}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full bg-[#3B82F6] transition-all"
                      style={{ width: `${profileCompleteness}%` }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setTab('profile')}
                    className="mt-2.5 text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Lengkapi profil & unggah CV PDF
                  </button>
                </div>
              </div>

              {/* Application Status Counters */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {[
                  { label: 'Menunggu Review', value: data.stats.menunggu_review, color: 'text-slate-700' },
                  { label: 'Diproses', value: data.stats.diproses, color: 'text-[#3B82F6]' },
                  { label: 'Interview', value: data.stats.interview, color: 'text-[#D97706]' },
                  { label: 'Diterima', value: data.stats.diterima, color: 'text-[#16A34A]' },
                  { label: 'Ditolak', value: data.stats.ditolak, color: 'text-rose-600' },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs text-slate-500">{stat.label}</p>
                    <p className={`mt-1.5 font-display text-2xl font-extrabold tabular-nums ${stat.color}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>

              {/* Latest Notifications */}
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-[#142B4A]">Notifikasi Terbaru</h2>
                  <button
                    type="button"
                    onClick={() => setTab('notifications')}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Lihat semua
                  </button>
                </div>

                {data.notifications.length === 0 ? (
                  <p className="text-sm text-slate-500">Belum ada notifikasi.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.notifications.slice(0, 3).map((n) => (
                      <div key={n.id} className="py-3 flex items-start justify-between gap-4">
                        <div>
                          <p className={`text-sm font-semibold ${n.isRead ? 'text-slate-700' : 'text-[#142B4A]'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-slate-600 mt-0.5">{n.message}</p>
                        </div>
                        <span className="text-xs text-slate-400 whitespace-nowrap tabular-nums">
                          {formatIndonesianDate(n.createdAt)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recommendations */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="font-display text-lg font-bold text-[#142B4A]">
                      Rekomendasi Magang Untukmu
                    </h2>
                    <p className="text-xs text-slate-500">
                      Disesuaikan berdasarkan jurusan ({data.profile.major || 'Umum'}) dan keterampilan profil Anda.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'search' })}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Cari lainnya
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.recommendations.map((job) => (
                    <InternshipCard
                      key={job.id}
                      internship={job}
                      onOpenDetail={(id) => onNavigate({ name: 'internship', id })}
                      onOpenCompany={(slug) => onNavigate({ name: 'company-profile', slug })}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === 'applications' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#142B4A]">Riwayat & Status Lamaran</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pantau progres seleksi dan jadwal interview secara real-time.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search' })}
                  className="rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
                >
                  Cari Lowongan Baru
                </button>
              </div>

              {data.applications.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600">Anda belum mengajukan lamaran magang apa pun.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'search' })}
                    className="mt-3 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Mulai Cari Magang
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {data.applications.map((app) => (
                    <div key={app.id} className="rounded-xl border border-slate-200 p-5">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="flex items-start gap-3.5">
                          <CompanyAvatar name={app.companyName || 'MK'} size="md" />
                          <div>
                            <button
                              type="button"
                              onClick={() => onNavigate({ name: 'internship', id: app.internshipId })}
                              className="font-display text-base font-bold text-[#142B4A] hover:text-[#3B82F6] text-left cursor-pointer"
                            >
                              {app.internshipTitle}
                            </button>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {app.companyName} · {app.location} · {app.workMode} · Dilamar{' '}
                              <span className="tabular-nums">{formatIndonesianDate(app.createdAt)}</span>
                            </p>
                          </div>
                        </div>
                        <ApplicationStatusLabel status={app.status} />
                      </div>

                      {app.companyNotes && (
                        <div className="mt-4 rounded-lg bg-slate-50 border border-slate-200 px-3.5 py-2.5 text-xs text-slate-700">
                          <span className="font-semibold text-[#142B4A]">Catatan Perusahaan: </span>
                          {app.companyNotes}
                        </div>
                      )}

                      {app.interview && (
                        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50/60 p-4">
                          <div className="flex items-center gap-2 text-xs font-bold text-[#142B4A]">
                            <CalendarClock className="h-4 w-4 text-[#3B82F6]" />
                            <span>Jadwal Interview ({app.interview.mode})</span>
                          </div>
                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700">
                            <p>
                              <span className="text-slate-500">Waktu: </span>
                              <span className="font-semibold tabular-nums">
                                {app.interview.scheduledAt.replace('T', ' pukul ')}
                              </span>
                            </p>
                            <p>
                              <span className="text-slate-500">Pewawancara: </span>
                              <span className="font-semibold">{app.interview.interviewerName}</span>
                            </p>
                            <p className="sm:col-span-2">
                              <span className="text-slate-500">Tautan / Lokasi: </span>
                              {app.interview.meetingLinkOrLocation.startsWith('http') ? (
                                <a
                                  href={app.interview.meetingLinkOrLocation}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-semibold text-[#3B82F6] hover:underline inline-flex items-center gap-1"
                                >
                                  <span>{app.interview.meetingLinkOrLocation}</span>
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              ) : (
                                <span className="font-semibold">{app.interview.meetingLinkOrLocation}</span>
                              )}
                            </p>
                            {app.interview.notes && (
                              <p className="sm:col-span-2 text-slate-600">{app.interview.notes}</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'saved' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="font-display text-xl font-bold text-[#142B4A] mb-1">Lowongan Disimpan</h1>
              <p className="text-xs text-slate-500 mb-6">Daftar posisi magang yang Anda tandai untuk dilamar nanti.</p>

              {data.savedJobs.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600">Belum ada lowongan yang disimpan.</p>
                  <button
                    type="button"
                    onClick={() => onNavigate({ name: 'search' })}
                    className="mt-3 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Jelajahi Lowongan
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.savedJobs.map((job) => (
                    <InternshipCard
                      key={job.id}
                      internship={job}
                      onOpenDetail={(id) => onNavigate({ name: 'internship', id })}
                      onOpenCompany={(slug) => onNavigate({ name: 'company-profile', slug })}
                      onToggleSave={handleToggleSave}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h1 className="font-display text-xl font-bold text-[#142B4A]">Profil Mahasiswa & Berkas</h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Data ini ditampilkan kepada perusahaan ketika Anda melamar dan digunakan untuk mencocokkan rekomendasi magang.
                </p>

                {profileNotice && (
                  <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-xs font-medium text-[#142B4A]">
                    {profileNotice}
                  </div>
                )}

                <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Perguruan Tinggi</label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="Contoh: Universitas Indonesia"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Jurusan / Program Studi</label>
                    <input
                      type="text"
                      value={major}
                      onChange={(e) => setMajor(e.target.value)}
                      placeholder="Contoh: Teknik Informatika"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Semester</label>
                      <input
                        type="number"
                        min={1}
                        max={14}
                        value={semester}
                        onChange={(e) => setSemester(Number(e.target.value))}
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">IPK</label>
                      <input
                        type="text"
                        value={gpa}
                        onChange={(e) => setGpa(e.target.value)}
                        placeholder="3.80"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none tabular-nums"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nomor Telepon / WhatsApp</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="0812-xxxx-xxxx"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Domisili</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Kota, Provinsi"
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ringkasan Diri</label>
                    <textarea
                      rows={3}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Ceritakan fokus studi, minat karier, dan pencapaian singkat Anda..."
                      className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Skills */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <label className="block text-xs font-semibold text-slate-700 mb-2">Keterampilan (Skills)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newSkill}
                      onChange={(e) => setNewSkill(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addSkill();
                        }
                      }}
                      placeholder="Tambah keterampilan (contoh: React, SQL, Figma)..."
                      className="flex-1 rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={addSkill}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer"
                    >
                      Tambah
                    </button>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {skills.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-[#142B4A]"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => setSkills(skills.filter((s) => s !== skill))}
                          className="text-slate-400 hover:text-rose-600 cursor-pointer"
                          aria-label={`Hapus ${skill}`}
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Organizations */}
                <div className="mt-6 border-t border-slate-100 pt-5">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-semibold text-slate-700">Pengalaman Organisasi & Kepanitiaan</label>
                    <button
                      type="button"
                      onClick={addOrganization}
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Tambah Pengalaman</span>
                    </button>
                  </div>

                  <div className="space-y-3">
                    {organizations.map((org, idx) => (
                      <div key={idx} className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2.5">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={org.name}
                            onChange={(e) => {
                              const next = [...organizations];
                              next[idx] = { ...org, name: e.target.value };
                              setOrganizations(next);
                            }}
                            placeholder="Nama Organisasi"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                          />
                          <input
                            type="text"
                            value={org.role}
                            onChange={(e) => {
                              const next = [...organizations];
                              next[idx] = { ...org, role: e.target.value };
                              setOrganizations(next);
                            }}
                            placeholder="Jabatan / Peran"
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                          />
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={org.period}
                              onChange={(e) => {
                                const next = [...organizations];
                                next[idx] = { ...org, period: e.target.value };
                                setOrganizations(next);
                              }}
                              placeholder="Periode (2024-2025)"
                              className="flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => setOrganizations(organizations.filter((_, i) => i !== idx))}
                              className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer"
                              aria-label="Hapus organisasi"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={org.description}
                          onChange={(e) => {
                            const next = [...organizations];
                            next[idx] = { ...org, description: e.target.value };
                            setOrganizations(next);
                          }}
                          placeholder="Deskripsi kontribusi singkat..."
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* CV & Portfolio Uploads */}
                <div className="mt-6 border-t border-slate-100 pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-lg border border-slate-200 p-4">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#142B4A]">
                      <FileText className="h-4 w-4 text-[#3B82F6]" />
                      <span>Upload CV (PDF, Maks. 5 MB)</span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {data.profile.cvFilename ? `Terunggah: ${data.profile.cvFilename}` : 'Belum ada file CV'}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 rounded-lg bg-[#142B4A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3d68] cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploadingCv ? 'Mengunggah...' : 'Pilih File PDF'}</span>
                        <input
                          type="file"
                          accept=".pdf,application/pdf"
                          className="sr-only"
                          onChange={handleUploadCv}
                        />
                      </label>
                      {data.profile.cvUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openProtectedFile(data.profile.cvUrl!, data.profile.cvFilename || 'CV.pdf')
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span>Unduh CV</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="rounded-lg border border-slate-200 p-4 space-y-2.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#142B4A]">
                      <Upload className="h-4 w-4 text-[#3B82F6]" />
                      <span>Portofolio (Tautan atau File)</span>
                    </div>
                    <input
                      type="url"
                      value={portfolioUrl}
                      onChange={(e) => setPortfolioUrl(e.target.value)}
                      placeholder="https://github.com/... atau https://dribbble.com/..."
                      className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer">
                        <Upload className="h-3.5 w-3.5" />
                        <span>{uploadingPortfolio ? 'Mengunggah...' : 'Unggah File Portofolio'}</span>
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          className="sr-only"
                          onChange={handleUploadPortfolio}
                        />
                      </label>
                      {data.profile.portfolioFileUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            openProtectedFile(
                              data.profile.portfolioFileUrl!,
                              data.profile.portfolioFilename || 'portofolio.pdf'
                            )
                          }
                          className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                        >
                          Unduh ({data.profile.portfolioFilename})
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="rounded-lg bg-[#142B4A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 cursor-pointer"
                  >
                    {savingProfile ? 'Menyimpan...' : 'Simpan Perubahan Profil'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {tab === 'notifications' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h1 className="font-display text-xl font-bold text-[#142B4A]">Notifikasi</h1>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>Tandai semua dibaca</span>
                  </button>
                )}
              </div>

              {data.notifications.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Tidak ada notifikasi saat ini.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.notifications.map((n) => (
                    <div
                      key={n.id}
                      className={`py-4 flex items-start justify-between gap-4 ${
                        n.isRead ? 'opacity-75' : ''
                      }`}
                    >
                      <div>
                        <p className="text-sm font-bold text-[#142B4A]">{n.title}</p>
                        <p className="text-sm text-slate-600 mt-1">{n.message}</p>
                        <p className="text-xs text-slate-400 mt-1.5 tabular-nums">
                          {formatIndonesianDate(n.createdAt)}
                        </p>
                      </div>
                      {!n.isRead && (
                        <button
                          type="button"
                          onClick={() => handleMarkRead(n.id)}
                          className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-semibold text-[#3B82F6] hover:bg-blue-50 whitespace-nowrap cursor-pointer"
                        >
                          Tandai Dibaca
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
