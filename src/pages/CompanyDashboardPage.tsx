import React, { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Building2,
  Bell,
  Plus,
  Pencil,
  Trash2,
  CalendarClock,
  FileText,
  ExternalLink,
  X,
} from 'lucide-react';
import type {
  Application,
  ApplicationStatus,
  Category,
  CompanyProfile,
  Internship,
  NotificationItem,
  WorkMode,
} from '../types';
import type { AppRoute } from '../components/Navbar';
import { useAuth } from '../context/AuthContext';
import {
  ApplicationStatusLabel,
  ModerationStatusLabel,
  VerifiedCompanyLabel,
  formatIndonesianDate,
} from '../components/StatusIndicator';

interface CompanyDashboardData {
  company: CompanyProfile;
  stats: {
    totalListings: number;
    activeListings: number;
    totalApplicants: number;
    interviewsScheduled: number;
  };
  internships: Internship[];
  applicants: Application[];
  notifications: NotificationItem[];
}

type CompanyTab = 'listings' | 'applicants' | 'profile' | 'notifications';

export const CompanyDashboardPage: React.FC<{ onNavigate: (r: AppRoute) => void }> = ({
  onNavigate,
}) => {
  const { apiFetch, refreshMe, openProtectedFile } = useAuth();
  const [tab, setTab] = useState<CompanyTab>('listings');
  const [data, setData] = useState<CompanyDashboardData | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Internship Create / Edit Modal
  const [jobModalOpen, setJobModalOpen] = useState(false);
  const [editingJobId, setEditingJobId] = useState<number | null>(null);
  const [jobTitle, setJobTitle] = useState('');
  const [jobCategoryId, setJobCategoryId] = useState<number>(1);
  const [jobLocation, setJobLocation] = useState('');
  const [jobWorkMode, setJobWorkMode] = useState<WorkMode>('Hybrid');
  const [jobDuration, setJobDuration] = useState(4);
  const [jobStipendAmount, setJobStipendAmount] = useState(3500000);
  const [jobDeadline, setJobDeadline] = useState('2026-12-30');
  const [jobDescription, setJobDescription] = useState('');
  const [jobResponsibilitiesText, setJobResponsibilitiesText] = useState('');
  const [jobQualificationsText, setJobQualificationsText] = useState('');
  const [jobBenefitsText, setJobBenefitsText] = useState('');
  const [jobSkillsText, setJobSkillsText] = useState('');
  const [jobMajorsText, setJobMajorsText] = useState('');
  const [savingJob, setSavingJob] = useState(false);

  // Applicant filter & selection
  const [filterJobId, setFilterJobId] = useState<string>('all');
  const [selectedApplicant, setSelectedApplicant] = useState<Application | null>(null);
  const [statusDraft, setStatusDraft] = useState<ApplicationStatus>('menunggu_review');
  const [notesDraft, setNotesDraft] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Interview Schedule Modal
  const [interviewModalApp, setInterviewModalApp] = useState<Application | null>(null);
  const [ivDateTime, setIvDateTime] = useState('2026-11-28T10:00');
  const [ivMode, setIvMode] = useState<'Online' | 'Offline'>('Online');
  const [ivLocation, setIvLocation] = useState('https://meet.google.com/magangkeren-interview');
  const [ivInterviewer, setIvInterviewer] = useState('');
  const [ivNotes, setIvNotes] = useState('');
  const [savingIv, setSavingIv] = useState(false);

  // Company profile form
  const [compName, setCompName] = useState('');
  const [compIndustry, setCompIndustry] = useState('');
  const [compSize, setCompSize] = useState('');
  const [compLocation, setCompLocation] = useState('');
  const [compWebsite, setCompWebsite] = useState('');
  const [compDesc, setCompDesc] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dash, cats] = await Promise.all([
        apiFetch<CompanyDashboardData>('/api/company/dashboard'),
        apiFetch<Category[]>('/api/categories'),
      ]);
      setData(dash);
      setCategories(cats);
      if (cats.length > 0 && !editingJobId) {
        setJobCategoryId(cats[0].id);
      }
      setCompName(dash.company.companyName);
      setCompIndustry(dash.company.industry);
      setCompSize(dash.company.companySize);
      setCompLocation(dash.company.location);
      setCompWebsite(dash.company.website);
      setCompDesc(dash.company.description);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat dashboard perusahaan.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, editingJobId]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openNewJobModal = () => {
    setEditingJobId(null);
    setJobTitle('');
    setJobCategoryId(categories[0]?.id || 1);
    setJobLocation(data?.company.location || 'Jakarta');
    setJobWorkMode('Hybrid');
    setJobDuration(4);
    setJobStipendAmount(3500000);
    setJobDeadline('2026-12-30');
    setJobDescription('');
    setJobResponsibilitiesText('');
    setJobQualificationsText('');
    setJobBenefitsText('');
    setJobSkillsText('');
    setJobMajorsText('');
    setJobModalOpen(true);
  };

  const openEditJobModal = (job: Internship) => {
    setEditingJobId(job.id);
    setJobTitle(job.title);
    setJobCategoryId(job.categoryId);
    setJobLocation(job.location);
    setJobWorkMode(job.workMode);
    setJobDuration(job.durationMonths);
    setJobStipendAmount(job.stipendAmount);
    setJobDeadline(job.deadline);
    setJobDescription(job.description);
    setJobResponsibilitiesText(job.responsibilities.join('\n'));
    setJobQualificationsText(job.qualifications.join('\n'));
    setJobBenefitsText(job.benefits.join('\n'));
    setJobSkillsText(job.requiredSkills.join(', '));
    setJobMajorsText(job.targetMajors.join(', '));
    setJobModalOpen(true);
  };

  const handleSaveJob = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingJob(true);
    setNotice(null);
    try {
      const payload = {
        categoryId: jobCategoryId,
        title: jobTitle,
        location: jobLocation,
        workMode: jobWorkMode,
        durationMonths: jobDuration,
        stipendAmount: jobStipendAmount,
        description: jobDescription,
        responsibilities: jobResponsibilitiesText.split('\n').map((s) => s.trim()).filter(Boolean),
        qualifications: jobQualificationsText.split('\n').map((s) => s.trim()).filter(Boolean),
        benefits: jobBenefitsText.split('\n').map((s) => s.trim()).filter(Boolean),
        requiredSkills: jobSkillsText.split(',').map((s) => s.trim()).filter(Boolean),
        targetMajors: jobMajorsText.split(',').map((s) => s.trim()).filter(Boolean),
        deadline: jobDeadline,
      };

      if (editingJobId) {
        await apiFetch(`/api/company/internships/${editingJobId}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
        setNotice('Lowongan magang berhasil diperbarui.');
      } else {
        await apiFetch('/api/company/internships', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        setNotice('Lowongan magang baru berhasil ditambahkan.');
      }
      setJobModalOpen(false);
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menyimpan lowongan.');
    } finally {
      setSavingJob(false);
    }
  };

  const handleDeleteJob = async (id: number) => {
    try {
      await apiFetch(`/api/company/internships/${id}`, { method: 'DELETE' });
      setNotice('Lowongan berhasil dihapus.');
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menghapus lowongan.');
    }
  };

  const openApplicantInspector = (app: Application) => {
    setSelectedApplicant(app);
    setStatusDraft(app.status);
    setNotesDraft(app.companyNotes || '');
  };

  const handleUpdateApplicantStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    setUpdatingStatus(true);
    try {
      await apiFetch(`/api/company/applications/${selectedApplicant.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: statusDraft, companyNotes: notesDraft }),
      });
      setNotice(`Status lamaran ${selectedApplicant.studentName} diperbarui.`);
      setSelectedApplicant(null);
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal memperbarui status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleScheduleInterview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewModalApp) return;
    setSavingIv(true);
    try {
      await apiFetch(`/api/company/applications/${interviewModalApp.id}/interview`, {
        method: 'POST',
        body: JSON.stringify({
          scheduledAt: ivDateTime,
          mode: ivMode,
          meetingLinkOrLocation: ivLocation,
          interviewerName: ivInterviewer || 'Tim Rekrutmen',
          notes: ivNotes,
        }),
      });
      setNotice(`Jadwal interview untuk ${interviewModalApp.studentName} tersimpan.`);
      setInterviewModalApp(null);
      await loadDashboard();
    } catch (err: any) {
      setNotice(err.message || 'Gagal menjadwalkan interview.');
    } finally {
      setSavingIv(false);
    }
  };

  const handleSaveCompanyProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setNotice(null);
    try {
      await apiFetch('/api/company/profile', {
        method: 'PUT',
        body: JSON.stringify({
          companyName: compName,
          industry: compIndustry,
          companySize: compSize,
          location: compLocation,
          website: compWebsite,
          description: compDesc,
        }),
      });
      await Promise.all([loadDashboard(), refreshMe()]);
      setNotice('Profil perusahaan berhasil diperbarui.');
    } catch (err: any) {
      setNotice(err.message || 'Gagal menyimpan profil perusahaan.');
    } finally {
      setSavingProfile(false);
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

  const filteredApplicants =
    filterJobId === 'all'
      ? data.applicants
      : data.applicants.filter((a) => String(a.internshipId) === filterJobId);

  const unreadCount = data.notifications.filter((n) => !n.isRead).length;

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        {/* Sidebar */}
        <aside className="lg:w-64 shrink-0">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1">
            <div className="px-3 py-3 border-b border-slate-100 mb-2">
              <p className="font-display text-sm font-bold text-[#142B4A] truncate">
                {data.company.companyName}
              </p>
              <div className="mt-1">
                <VerifiedCompanyLabel status={data.company.verifiedStatus} />
              </div>
            </div>

            {[
              { id: 'listings' as const, label: 'Lowongan Magang', Icon: LayoutDashboard, count: data.stats.totalListings },
              { id: 'applicants' as const, label: 'Daftar Pelamar', Icon: Users, count: data.stats.totalApplicants },
              { id: 'profile' as const, label: 'Profil Perusahaan', Icon: Building2 },
              { id: 'notifications' as const, label: 'Notifikasi', Icon: Bell, count: unreadCount || undefined },
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
                    <span className={`text-xs font-mono tabular-nums ${active ? 'text-blue-200' : 'text-slate-500'}`}>
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 space-y-6">
          {data.company.verifiedStatus === 'pending' && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-3.5 text-xs sm:text-sm text-amber-800">
              Akun perusahaan Anda sedang dalam antrean verifikasi Administrator. Lowongan baru akan berstatus menunggu moderasi sampai akun terverifikasi.
            </div>
          )}

          {notice && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-5 py-3 text-xs sm:text-sm font-medium text-[#142B4A] flex items-center justify-between">
              <span>{notice}</span>
              <button type="button" onClick={() => setNotice(null)} className="text-slate-500 hover:text-slate-800 cursor-pointer">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Lowongan</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#142B4A] tabular-nums">
                {data.stats.totalListings}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Lowongan Aktif</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#16A34A] tabular-nums">
                {data.stats.activeListings}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Total Pelamar</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#3B82F6] tabular-nums">
                {data.stats.totalApplicants}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">Jadwal Interview</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#D97706] tabular-nums">
                {data.stats.interviewsScheduled}
              </p>
            </div>
          </div>

          {tab === 'listings' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#142B4A]">Kelola Lowongan Magang</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Buat, perbarui, atau hapus program magang perusahaan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={openNewJobModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white hover:bg-[#1e3d68] whitespace-nowrap cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Lowongan</span>
                </button>
              </div>

              {data.internships.length === 0 ? (
                <div className="py-12 text-center">
                  <p className="text-sm text-slate-600">Belum ada lowongan magang yang dipublikasikan.</p>
                  <button
                    type="button"
                    onClick={openNewJobModal}
                    className="mt-3 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
                  >
                    Buat Lowongan Pertama
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 text-xs font-semibold text-slate-500">
                        <th className="py-3 pr-4">Posisi Magang</th>
                        <th className="py-3 px-4">Sistem & Lokasi</th>
                        <th className="py-3 px-4 text-right">Pelamar</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 pl-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {data.internships.map((job) => (
                        <tr key={job.id} className="hover:bg-slate-50/70">
                          <td className="py-3.5 pr-4">
                            <button
                              type="button"
                              onClick={() => onNavigate({ name: 'internship', id: job.id })}
                              className="font-semibold text-[#142B4A] hover:text-[#3B82F6] text-left cursor-pointer"
                            >
                              {job.title}
                            </button>
                            <p className="text-xs text-slate-500 mt-0.5 tabular-nums">
                              {job.categoryName} · {job.durationMonths} bln · Deadline {formatIndonesianDate(job.deadline)}
                            </p>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-slate-600 whitespace-nowrap">
                            {job.workMode} · {job.location}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono font-semibold text-[#142B4A] tabular-nums">
                            {job.applicantsCount ?? 0}
                          </td>
                          <td className="py-3.5 px-4">
                            <ModerationStatusLabel status={job.moderationStatus} />
                          </td>
                          <td className="py-3.5 pl-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openEditJobModal(job)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-[#142B4A] cursor-pointer"
                                title="Edit lowongan"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteJob(job.id)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                                title="Hapus lowongan"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'applicants' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-5">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#142B4A]">Daftar & Seleksi Pelamar</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tinjau CV PDF, portofolio, ubah status seleksi, dan atur jadwal interview kandidat.
                  </p>
                </div>

                <select
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-[#142B4A] focus:border-[#3B82F6] focus:outline-none"
                >
                  <option value="all">Semua Lowongan ({data.applicants.length})</option>
                  {data.internships.map((j) => (
                    <option key={j.id} value={String(j.id)}>
                      {j.title}
                    </option>
                  ))}
                </select>
              </div>

              {filteredApplicants.length === 0 ? (
                <p className="py-12 text-center text-sm text-slate-500">
                  Belum ada pelamar untuk filter lowongan ini.
                </p>
              ) : (
                <div className="space-y-4">
                  {filteredApplicants.map((app) => (
                    <div key={app.id} className="rounded-xl border border-slate-200 p-5">
                      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                        <div>
                          <div className="flex flex-wrap items-center gap-2.5">
                            <h3 className="font-display text-base font-bold text-[#142B4A]">
                              {app.studentName}
                            </h3>
                            <ApplicationStatusLabel status={app.status} />
                          </div>
                          <p className="text-xs text-slate-600 mt-1">
                            Melamar: <strong className="text-[#142B4A]">{app.internshipTitle}</strong> ·{' '}
                            {app.studentUniversity || 'Kampus belum diisi'} ({app.studentMajor || 'Umum'} · Sem{' '}
                            {app.studentSemester || '-'} · IPK {app.studentGpa || '-'})
                          </p>
                          {app.studentSkills && app.studentSkills.length > 0 && (
                            <p className="text-xs text-slate-500 mt-1.5">
                              Keterampilan: {app.studentSkills.join(' · ')}
                            </p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          {app.cvSnapshotUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                openProtectedFile(app.cvSnapshotUrl!, app.cvSnapshotName || 'CV-Pelamar.pdf')
                              }
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer"
                            >
                              <FileText className="h-3.5 w-3.5 text-[#3B82F6]" />
                              <span>Lihat CV PDF</span>
                            </button>
                          )}
                          {app.portfolioSnapshotUrl && (
                            app.portfolioSnapshotUrl.startsWith('/api/files/') ? (
                              <button
                                type="button"
                                onClick={() => openProtectedFile(app.portfolioSnapshotUrl!, 'Portofolio')}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Portofolio</span>
                              </button>
                            ) : (
                              <a
                                href={app.portfolioSnapshotUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6]"
                              >
                                <ExternalLink className="h-3.5 w-3.5" />
                                <span>Portofolio</span>
                              </a>
                            )
                          )}
                          <button
                            type="button"
                            onClick={() => openApplicantInspector(app)}
                            className="rounded-lg bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
                          >
                            Seleksi / Ubah Status
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setInterviewModalApp(app);
                              if (app.interview) {
                                setIvDateTime(app.interview.scheduledAt);
                                setIvMode(app.interview.mode);
                                setIvLocation(app.interview.meetingLinkOrLocation);
                                setIvInterviewer(app.interview.interviewerName);
                                setIvNotes(app.interview.notes);
                              }
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-[#3B82F6] px-3 py-1.5 text-xs font-semibold text-[#3B82F6] hover:bg-blue-50 cursor-pointer"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                            <span>{app.interview ? 'Edit Interview' : 'Jadwalkan Interview'}</span>
                          </button>
                        </div>
                      </div>

                      <p className="mt-3 text-xs text-slate-700 bg-slate-50 rounded-lg p-3 border border-slate-100">
                        <span className="font-semibold text-[#142B4A]">Motivasi Pelamar: </span>
                        {app.coverLetter}
                      </p>

                      {app.interview && (
                        <p className="mt-2.5 text-xs font-medium text-[#D97706] tabular-nums">
                          Interview dijadwalkan: {app.interview.scheduledAt.replace('T', ' ')} ({app.interview.mode}) ·{' '}
                          {app.interview.meetingLinkOrLocation}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tab === 'profile' && (
            <form onSubmit={handleSaveCompanyProfile} className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <div>
                  <h1 className="font-display text-xl font-bold text-[#142B4A]">Profil Perusahaan</h1>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Informasi ini tampil di halaman profil publik perusahaan Anda.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'company-profile', slug: data.company.slug })}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                >
                  <span>Lihat Profil Publik</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Nama Perusahaan</label>
                  <input
                    type="text"
                    required
                    value={compName}
                    onChange={(e) => setCompName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Industri</label>
                  <input
                    type="text"
                    value={compIndustry}
                    onChange={(e) => setCompIndustry(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Ukuran Perusahaan</label>
                  <select
                    value={compSize}
                    onChange={(e) => setCompSize(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  >
                    <option value="1-10 Karyawan">1-10 Karyawan</option>
                    <option value="11-50 Karyawan">11-50 Karyawan</option>
                    <option value="51-200 Karyawan">51-200 Karyawan</option>
                    <option value="201-500 Karyawan">201-500 Karyawan</option>
                    <option value="501-1000 Karyawan">501-1000 Karyawan</option>
                    <option value="1000+ Karyawan">1000+ Karyawan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi Kantor Utama</label>
                  <input
                    type="text"
                    value={compLocation}
                    onChange={(e) => setCompLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Situs Web Resmi</label>
                  <input
                    type="url"
                    value={compWebsite}
                    onChange={(e) => setCompWebsite(e.target.value)}
                    placeholder="https://perusahaan.id"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Tentang Perusahaan</label>
                  <textarea
                    rows={4}
                    value={compDesc}
                    onChange={(e) => setCompDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-[#142B4A] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 cursor-pointer"
                >
                  {savingProfile ? 'Menyimpan...' : 'Simpan Profil Perusahaan'}
                </button>
              </div>
            </form>
          )}

          {tab === 'notifications' && (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                <h1 className="font-display text-xl font-bold text-[#142B4A]">Notifikasi Perusahaan</h1>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={async () => {
                      await apiFetch('/api/notifications/read-all', { method: 'POST' });
                      await Promise.all([loadDashboard(), refreshMe()]);
                    }}
                    className="text-xs font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                  >
                    Tandai semua dibaca
                  </button>
                )}
              </div>
              {data.notifications.length === 0 ? (
                <p className="py-10 text-center text-sm text-slate-500">Belum ada notifikasi.</p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.notifications.map((n) => (
                    <div key={n.id} className="py-3.5 flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-bold text-[#142B4A]">{n.title}</p>
                        <p className="text-xs text-slate-600 mt-1">{n.message}</p>
                      </div>
                      <span className="text-xs text-slate-400 tabular-nums whitespace-nowrap">
                        {formatIndonesianDate(n.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add / Edit Internship Modal */}
      {jobModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-2xl rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <h2 className="font-display text-lg font-bold text-[#142B4A]">
                {editingJobId ? 'Edit Lowongan Magang' : 'Tambah Lowongan Magang Baru'}
              </h2>
              <button
                type="button"
                onClick={() => setJobModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSaveJob} className="p-6 max-h-[80vh] overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Posisi Magang</label>
                  <input
                    type="text"
                    required
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="Contoh: Backend Engineer Intern"
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kategori</label>
                  <select
                    value={jobCategoryId}
                    onChange={(e) => setJobCategoryId(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Lokasi</label>
                  <input
                    type="text"
                    required
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Sistem Kerja</label>
                  <select
                    value={jobWorkMode}
                    onChange={(e) => setJobWorkMode(e.target.value as WorkMode)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="Hybrid">Hybrid</option>
                    <option value="WFO">WFO</option>
                    <option value="WFH">WFH</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Durasi (Bulan)</label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      required
                      value={jobDuration}
                      onChange={(e) => setJobDuration(Number(e.target.value))}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
                    <input
                      type="date"
                      required
                      value={jobDeadline}
                      onChange={(e) => setJobDeadline(e.target.value)}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Uang Saku per Bulan (IDR, isi 0 jika Unpaid / Sertifikat)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100000}
                    value={jobStipendAmount}
                    onChange={(e) => setJobStipendAmount(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm tabular-nums"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Deskripsi Pekerjaan</label>
                  <textarea
                    rows={3}
                    required
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tanggung Jawab (1 per baris)
                  </label>
                  <textarea
                    rows={3}
                    value={jobResponsibilitiesText}
                    onChange={(e) => setJobResponsibilitiesText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Kualifikasi (1 per baris)
                  </label>
                  <textarea
                    rows={3}
                    value={jobQualificationsText}
                    onChange={(e) => setJobQualificationsText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Benefit (1 per baris)</label>
                  <textarea
                    rows={2}
                    value={jobBenefitsText}
                    onChange={(e) => setJobBenefitsText(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Keterampilan Wajib (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={jobSkillsText}
                    onChange={(e) => setJobSkillsText(e.target.value)}
                    placeholder="React, TypeScript, Git"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Jurusan Relevan (pisahkan koma)
                  </label>
                  <input
                    type="text"
                    value={jobMajorsText}
                    onChange={(e) => setJobMajorsText(e.target.value)}
                    placeholder="Teknik Informatika, Sistem Informasi"
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setJobModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingJob}
                  className="rounded-lg bg-[#142B4A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 cursor-pointer"
                >
                  {savingJob ? 'Menyimpan...' : editingJobId ? 'Simpan Perubahan' : 'Publikasikan Lowongan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Applicant Status Modal */}
      {selectedApplicant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#142B4A]">
                  Seleksi Pelamar: {selectedApplicant.studentName}
                </h2>
                <p className="text-xs text-slate-500">{selectedApplicant.internshipTitle}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedApplicant(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleUpdateApplicantStatus} className="p-6 space-y-4">
              {selectedApplicant.studentOrganizations && selectedApplicant.studentOrganizations.length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-xs space-y-1">
                  <p className="font-semibold text-[#142B4A]">Pengalaman Organisasi:</p>
                  {selectedApplicant.studentOrganizations.map((o, idx) => (
                    <p key={idx} className="text-slate-600">
                      • {o.name} ({o.role}, {o.period})
                    </p>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Status Lamaran</label>
                <select
                  value={statusDraft}
                  onChange={(e) => setStatusDraft(e.target.value as ApplicationStatus)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-[#142B4A]"
                >
                  <option value="menunggu_review">Menunggu Review</option>
                  <option value="diproses">Diproses</option>
                  <option value="interview">Interview</option>
                  <option value="diterima">Diterima</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Catatan / Umpan Balik untuk Mahasiswa
                </label>
                <textarea
                  rows={3}
                  value={notesDraft}
                  onChange={(e) => setNotesDraft(e.target.value)}
                  placeholder="Contoh: Lolos seleksi berkas, silakan tunggu jadwal interview..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApplicant(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={updatingStatus}
                  className="rounded-lg bg-[#142B4A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
                >
                  {updatingStatus ? 'Menyimpan...' : 'Perbarui Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Interview Schedule Modal */}
      {interviewModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-base font-bold text-[#142B4A]">Atur Jadwal Interview</h2>
                <p className="text-xs text-slate-500">
                  {interviewModalApp.studentName} · {interviewModalApp.internshipTitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInterviewModalApp(null)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleScheduleInterview} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal & Waktu</label>
                <input
                  type="datetime-local"
                  required
                  value={ivDateTime}
                  onChange={(e) => setIvDateTime(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm tabular-nums"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mode Wawancara</label>
                <select
                  value={ivMode}
                  onChange={(e) => setIvMode(e.target.value as 'Online' | 'Offline')}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="Online">Online (Video Call)</option>
                  <option value="Offline">Offline (Tatap Muka di Kantor)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {ivMode === 'Online' ? 'Tautan Meeting' : 'Alamat Kantor'}
                </label>
                <input
                  type="text"
                  required
                  value={ivLocation}
                  onChange={(e) => setIvLocation(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Pewawancara</label>
                <input
                  type="text"
                  value={ivInterviewer}
                  onChange={(e) => setIvInterviewer(e.target.value)}
                  placeholder="Contoh: Raka Mahendra (Engineering Manager)"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Catatan Persiapan</label>
                <textarea
                  rows={2}
                  value={ivNotes}
                  onChange={(e) => setIvNotes(e.target.value)}
                  placeholder="Instruksi singkat untuk kandidat..."
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setInterviewModalApp(null)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingIv}
                  className="rounded-lg bg-[#142B4A] px-5 py-2 text-xs font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
                >
                  {savingIv ? 'Menyimpan...' : 'Simpan & Kirim Undangan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
