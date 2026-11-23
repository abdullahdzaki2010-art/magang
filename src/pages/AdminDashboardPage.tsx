import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShieldCheck,
  Users,
  Briefcase,
  FolderKanban,
  Activity,
  Plus,
  Trash2,
} from 'lucide-react';
import type {
  ActivityLog,
  Category,
  Internship,
  ModerationStatus,
  VerifiedStatus,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  ModerationStatusLabel,
  VerifiedCompanyLabel,
  formatIndonesianDate,
} from '../components/StatusIndicator';

interface AdminCompanyRow {
  id: number;
  userId: number;
  companyName: string;
  slug: string;
  industry: string;
  location: string;
  verifiedStatus: VerifiedStatus;
  ownerEmail: string;
  ownerName: string;
  listingsCount: number;
  createdAt: string;
}

interface AdminUserRow {
  id: number;
  email: string;
  fullName: string;
  role: 'mahasiswa' | 'perusahaan' | 'admin';
  status: 'active' | 'suspended';
  createdAt: string;
}

interface AdminDashboardData {
  stats: {
    totalStudents: number;
    totalCompanies: number;
    verifiedCompanies: number;
    pendingCompanies: number;
    activeInternships: number;
    totalApplications: number;
  };
  companies: AdminCompanyRow[];
  users: AdminUserRow[];
  internships: Internship[];
  categories: Category[];
  activityLogs: ActivityLog[];
}

type AdminTab = 'overview' | 'companies' | 'internships' | 'users' | 'categories' | 'logs';

export const AdminDashboardPage: React.FC = () => {
  const { user, apiFetch } = useAuth();
  const [tab, setTab] = useState<AdminTab>('overview');
  const [data, setData] = useState<AdminDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // New Category form
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');
  const [savingCat, setSavingCat] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<AdminDashboardData>('/api/admin/dashboard');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat konsol administrator.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleVerifyCompany = async (id: number, status: VerifiedStatus) => {
    setNotice(null);
    try {
      await apiFetch(`/api/admin/companies/${id}/verify`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Status verifikasi perusahaan diperbarui.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal memperbarui verifikasi.');
    }
  };

  const handleUserStatus = async (id: number, status: 'active' | 'suspended') => {
    setNotice(null);
    try {
      await apiFetch(`/api/admin/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Status pengguna berhasil diperbarui.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal mengubah status pengguna.');
    }
  };

  const handleModeration = async (id: number, status: ModerationStatus) => {
    setNotice(null);
    try {
      await apiFetch(`/api/admin/internships/${id}/moderation`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setNotice('Status moderasi lowongan diperbarui.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal memperbarui moderasi.');
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCat(true);
    setNotice(null);
    try {
      await apiFetch('/api/admin/categories', {
        method: 'POST',
        body: JSON.stringify({ name: catName, description: catDesc }),
      });
      setCatName('');
      setCatDesc('');
      setNotice('Kategori baru berhasil ditambahkan.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menambah kategori.');
    } finally {
      setSavingCat(false);
    }
  };

  const handleDeleteCategory = async (id: number) => {
    setNotice(null);
    try {
      await apiFetch(`/api/admin/categories/${id}`, { method: 'DELETE' });
      setNotice('Kategori dihapus.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menghapus kategori.');
    }
  };

  if (loading && !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-96 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10 text-center">
        <p className="text-sm text-rose-700">{error || 'Gagal memuat data.'}</p>
        <button
          type="button"
          onClick={loadDashboard}
          className="mt-3 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          Muat Ulang
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="px-3 py-3 border-b border-slate-100 mb-2">
              <p className="font-display text-sm font-bold text-[#142B4A]">Administrator</p>
              <p className="text-xs text-slate-500 truncate mt-0.5">{user?.email}</p>
            </div>

            {[
              { id: 'overview' as const, label: 'Ringkasan Platform', Icon: LayoutDashboard },
              {
                id: 'companies' as const,
                label: 'Verifikasi Perusahaan',
                Icon: ShieldCheck,
                count: data.stats.pendingCompanies || undefined,
              },
              { id: 'internships' as const, label: 'Moderasi Lowongan', Icon: Briefcase },
              { id: 'users' as const, label: 'Manajemen Pengguna', Icon: Users },
              { id: 'categories' as const, label: 'Kategori Magang', Icon: FolderKanban },
              { id: 'logs' as const, label: 'Laporan Aktivitas', Icon: Activity },
            ].map((item) => {
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
                    <span className="text-xs font-mono tabular-nums text-[#F59E0B]">{item.count}</span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        <main className="flex-1 min-w-0 space-y-6">
          {notice && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-xs sm:text-sm font-medium text-[#142B4A]">
              {notice}
            </div>
          )}

          {/* KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Mahasiswa</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#142B4A] tabular-nums">
                {data.stats.totalStudents}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Perusahaan</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#142B4A] tabular-nums">
                {data.stats.totalCompanies}
              </p>
              <p className="text-xs text-[#D97706] mt-0.5 tabular-nums">
                {data.stats.pendingCompanies} menunggu verifikasi
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Lowongan Aktif</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#16A34A] tabular-nums">
                {data.stats.activeInternships}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Lamaran</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#3B82F6] tabular-nums">
                {data.stats.totalApplications}
              </p>
            </div>
          </div>

          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-base font-bold text-[#142B4A]">
                    Antrean Verifikasi Perusahaan
                  </h2>
                  <button
                    type="button"
                    onClick={() => setTab('companies')}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Kelola semua perusahaan
                  </button>
                </div>
                {data.companies.filter((c) => c.verifiedStatus === 'pending').length === 0 ? (
                  <p className="text-sm text-slate-500">Semua perusahaan telah diverifikasi.</p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {data.companies
                      .filter((c) => c.verifiedStatus === 'pending')
                      .map((c) => (
                        <div key={c.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-bold text-[#142B4A]">{c.companyName}</p>
                            <p className="text-xs text-slate-500">
                              {c.industry} · {c.location} · PIC: {c.ownerName} ({c.ownerEmail})
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleVerifyCompany(c.id, 'verified')}
                              className="rounded-lg bg-[#22C55E] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 cursor-pointer"
                            >
                              Verifikasi
                            </button>
                            <button
                              type="button"
                              onClick={() => handleVerifyCompany(c.id, 'rejected')}
                              className="rounded-lg border border-rose-200 px-3.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              Tolak
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-[#142B4A] mb-4">Aktivitas Platform Terbaru</h2>
                <div className="divide-y divide-slate-100">
                  {data.activityLogs.slice(0, 6).map((log) => (
                    <div key={log.id} className="py-3 flex items-start justify-between gap-4 text-xs">
                      <div>
                        <span className="font-semibold text-[#142B4A]">{log.action}</span>{' '}
                        <span className="text-slate-500">oleh {log.actorName}</span>
                        <p className="text-slate-600 mt-0.5">{log.details}</p>
                      </div>
                      <span className="text-slate-400 tabular-nums whitespace-nowrap">
                        {formatIndonesianDate(log.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'companies' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="font-display text-xl font-bold text-[#142B4A] mb-5">Verifikasi Perusahaan Mitra</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">Perusahaan</th>
                      <th className="py-3 px-4">PIC & Email</th>
                      <th className="py-3 px-4 text-right">Lowongan</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Tindakan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.companies.map((c) => (
                      <tr key={c.id}>
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-[#142B4A]">{c.companyName}</p>
                          <p className="text-xs text-slate-500">{c.industry} · {c.location}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">
                          {c.ownerName} ({c.ownerEmail})
                        </td>
                        <td className="py-3.5 px-4 text-right font-mono tabular-nums">{c.listingsCount}</td>
                        <td className="py-3.5 px-4">
                          <VerifiedCompanyLabel status={c.verifiedStatus} />
                        </td>
                        <td className="py-3.5 pl-4 text-right whitespace-nowrap space-x-2">
                          {c.verifiedStatus !== 'verified' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyCompany(c.id, 'verified')}
                              className="rounded-lg bg-[#142B4A] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
                            >
                              Verifikasi
                            </button>
                          )}
                          {c.verifiedStatus !== 'rejected' && (
                            <button
                              type="button"
                              onClick={() => handleVerifyCompany(c.id, 'rejected')}
                              className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              Tolak
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'internships' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="font-display text-xl font-bold text-[#142B4A] mb-5">Moderasi Lowongan Magang</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">Lowongan</th>
                      <th className="py-3 px-4">Perusahaan</th>
                      <th className="py-3 px-4">Status Saat Ini</th>
                      <th className="py-3 pl-4 text-right">Ubah Moderasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.internships.map((job) => (
                      <tr key={job.id}>
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-[#142B4A]">{job.title}</p>
                          <p className="text-xs text-slate-500">{job.categoryName} · {job.workMode}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-slate-600">{job.companyName}</td>
                        <td className="py-3.5 px-4">
                          <ModerationStatusLabel status={job.moderationStatus} />
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <select
                            value={job.moderationStatus}
                            onChange={(e) => handleModeration(job.id, e.target.value as ModerationStatus)}
                            className="rounded-lg border border-slate-300 px-2.5 py-1.5 text-xs font-medium text-[#142B4A]"
                          >
                            <option value="active">Aktif</option>
                            <option value="pending">Pending</option>
                            <option value="flagged">Ditandai</option>
                            <option value="closed">Ditutup</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="font-display text-xl font-bold text-[#142B4A] mb-5">Manajemen Pengguna</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">Nama & Email</th>
                      <th className="py-3 px-4">Peran</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 pl-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {data.users.map((u) => (
                      <tr key={u.id}>
                        <td className="py-3.5 pr-4">
                          <p className="font-semibold text-[#142B4A]">{u.fullName}</p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </td>
                        <td className="py-3.5 px-4 text-xs font-medium capitalize text-slate-700">{u.role}</td>
                        <td className="py-3.5 px-4 text-xs font-semibold">
                          <span className={u.status === 'active' ? 'text-[#16A34A]' : 'text-rose-600'}>
                            {u.status === 'active' ? 'Aktif' : 'Dinonaktifkan'}
                          </span>
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          {u.role !== 'admin' && (
                            <button
                              type="button"
                              onClick={() =>
                                handleUserStatus(u.id, u.status === 'active' ? 'suspended' : 'active')
                              }
                              className={`rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                                u.status === 'active'
                                  ? 'border border-rose-200 text-rose-600 hover:bg-rose-50'
                                  : 'bg-[#142B4A] text-white hover:bg-[#1e3d68]'
                              }`}
                            >
                              {u.status === 'active' ? 'Suspend' : 'Aktifkan'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'categories' && (
            <div className="space-y-6">
              <form onSubmit={handleAddCategory} className="rounded-xl border border-slate-200 bg-white p-6">
                <h1 className="font-display text-xl font-bold text-[#142B4A] mb-4">Tambah Kategori Magang</h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    placeholder="Nama Kategori (mis. Cyber Security)"
                    className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                  <input
                    type="text"
                    value={catDesc}
                    onChange={(e) => setCatDesc(e.target.value)}
                    placeholder="Deskripsi singkat kategori..."
                    className="rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    disabled={savingCat}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#142B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{savingCat ? 'Menambah...' : 'Tambah Kategori'}</span>
                  </button>
                </div>
              </form>

              <div className="rounded-xl border border-slate-200 bg-white p-6">
                <h2 className="font-display text-base font-bold text-[#142B4A] mb-4">Daftar Kategori</h2>
                <div className="divide-y divide-slate-100">
                  {data.categories.map((c) => (
                    <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#142B4A]">{c.name}</p>
                        <p className="text-xs text-slate-500">{c.description}</p>
                      </div>
                      <div className="flex items-center gap-4 shrink-0">
                        <span className="text-xs font-mono text-slate-500 tabular-nums">
                          {c.internshipCount ?? 0} lowongan
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(c.id)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                          title="Hapus kategori"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'logs' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h1 className="font-display text-xl font-bold text-[#142B4A] mb-5">Laporan Aktivitas Platform</h1>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                      <th className="py-3 pr-4">Waktu</th>
                      <th className="py-3 px-4">Aktor</th>
                      <th className="py-3 px-4">Aksi</th>
                      <th className="py-3 pl-4">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {data.activityLogs.map((log) => (
                      <tr key={log.id}>
                        <td className="py-3 pr-4 font-mono text-slate-500 tabular-nums whitespace-nowrap">
                          {formatIndonesianDate(log.createdAt)}
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#142B4A] whitespace-nowrap">
                          {log.actorName} ({log.actorRole})
                        </td>
                        <td className="py-3 px-4 font-medium text-[#3B82F6] whitespace-nowrap">
                          {log.action}
                        </td>
                        <td className="py-3 pl-4 text-slate-600">{log.details}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
