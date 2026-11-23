import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bookmark,
  CheckCircle2,
  ShieldCheck,
  Upload,
  FileText,
  X,
} from 'lucide-react';
import type { CompanyProfile, Internship } from '../types';
import type { AppRoute } from '../components/Navbar';
import { CompanyAvatar } from '../components/CompanyAvatar';
import { formatIndonesianDate } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';

export const InternshipDetailPage: React.FC<{
  internshipId: number;
  onNavigate: (r: AppRoute) => void;
}> = ({ internshipId, onNavigate }) => {
  const { user, studentProfile, apiFetch, openAuthModal, refreshMe } = useAuth();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [portfolioUrl, setPortfolioUrl] = useState('');
  const [cvUploading, setCvUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  const fetchDetail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<{ internship: Internship; company: CompanyProfile }>(
        `/api/internships/${internshipId}`
      );
      setInternship(res.internship);
      setCompany(res.company);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat detail lowongan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [internshipId, user?.id]);

  useEffect(() => {
    if (studentProfile) {
      setPortfolioUrl(studentProfile.portfolioUrl || '');
    }
  }, [studentProfile]);

  const handleToggleSave = async () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (user.role !== 'mahasiswa' || !internship) return;
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/internships/${internship.id}/save`, {
        method: 'POST',
      });
      setInternship({ ...internship, isSaved: res.saved });
    } catch {
      // Ignore
    }
  };

  const handleOpenApply = () => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (user.role !== 'mahasiswa') {
      setApplyError('Hanya akun Mahasiswa yang dapat mengajukan lamaran magang.');
      return;
    }
    setApplyError(null);
    setApplyModalOpen(true);
  };

  const handleCvUploadInModal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCvUploading(true);
    setApplyError(null);
    try {
      const formData = new FormData();
      formData.append('cv', file);
      await apiFetch('/api/student/upload-cv', {
        method: 'POST',
        body: formData,
      });
      await refreshMe();
    } catch (err: any) {
      setApplyError(err.message || 'Gagal mengunggah CV PDF.');
    } finally {
      setCvUploading(false);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!internship) return;
    setSubmitting(true);
    setApplyError(null);
    try {
      await apiFetch(`/api/internships/${internship.id}/apply`, {
        method: 'POST',
        body: JSON.stringify({ coverLetter, portfolioUrl }),
      });
      setApplySuccess(true);
      setApplyModalOpen(false);
      setInternship({ ...internship, hasApplied: true });
      await refreshMe();
    } catch (err: any) {
      setApplyError(err.message || 'Gagal mengirim lamaran.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !internship || !company) {
    return (
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-8 text-center">
          <p className="text-sm font-medium text-rose-700">{error || 'Lowongan tidak ditemukan.'}</p>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="mt-4 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
          >
            Kembali ke Cari Magang
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => onNavigate({ name: 'search' })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#142B4A] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Kembali ke Daftar Lowongan</span>
      </button>

      {applySuccess && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 text-sm font-medium text-emerald-800">
            <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
            <span>Lamaran Anda berhasil dikirim ke {company.companyName}! Pantau progresnya di Dashboard Mahasiswa.</span>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'dashboard' })}
            className="rounded-lg bg-[#142B4A] px-3.5 py-1.5 text-xs font-semibold text-white whitespace-nowrap cursor-pointer"
          >
            Buka Dashboard
          </button>
        </div>
      )}

      {applyError && !applyModalOpen && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {applyError}
        </div>
      )}

      {/* Header Card */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex items-start gap-4">
            <CompanyAvatar name={company.companyName} size="lg" />
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'company-profile', slug: company.slug })}
                  className="text-sm font-semibold text-[#3B82F6] hover:underline cursor-pointer"
                >
                  {company.companyName}
                </button>
                {company.verifiedStatus === 'verified' && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A]">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Terverifikasi
                  </span>
                )}
                <span className="text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{company.industry}</span>
              </div>

              <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
                {internship.title}
              </h1>

              <div className="mt-3 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-600 tabular-nums">
                <span>{internship.categoryName}</span>
                <span aria-hidden="true">·</span>
                <span>Diposting {formatIndonesianDate(internship.createdAt)}</span>
                {typeof internship.applicantsCount === 'number' && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{internship.applicantsCount} pelamar</span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={handleToggleSave}
              className={`inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                internship.isSaved
                  ? 'border-[#3B82F6] bg-blue-50 text-[#3B82F6]'
                  : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${internship.isSaved ? 'fill-current' : ''}`} />
              <span>{internship.isSaved ? 'Tersimpan' : 'Simpan Lowongan'}</span>
            </button>

            <button
              type="button"
              disabled={internship.hasApplied}
              onClick={handleOpenApply}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition-colors whitespace-nowrap ${
                internship.hasApplied
                  ? 'bg-[#22C55E] cursor-default'
                  : 'bg-[#142B4A] hover:bg-[#1e3d68] cursor-pointer'
              }`}
            >
              {internship.hasApplied ? 'Sudah Dilamar' : 'Lamar Sekarang'}
            </button>
          </div>
        </div>

        {/* Key Facts Strip */}
        <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-5 border-t border-slate-200 pt-6">
          <div>
            <p className="text-xs font-medium text-slate-500">Lokasi & Sistem Kerja</p>
            <p className="mt-1 text-sm font-bold text-[#142B4A]">
              {internship.location} · {internship.workMode}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Durasi Magang</p>
            <p className="mt-1 text-sm font-bold text-[#142B4A] tabular-nums">
              {internship.durationMonths} Bulan
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Uang Saku</p>
            <p className="mt-1 text-sm font-bold text-[#142B4A] tabular-nums">
              {internship.stipendLabel}
            </p>
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500">Deadline Pendaftaran</p>
            <p className="mt-1 text-sm font-bold text-[#D97706] tabular-nums">
              {formatIndonesianDate(internship.deadline)}
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-8 rounded-xl border border-slate-200 bg-white p-6 sm:p-8">
          <section>
            <h2 className="font-display text-lg font-bold text-[#142B4A] mb-3">Deskripsi Pekerjaan</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line">
              {internship.description}
            </p>
          </section>

          {internship.responsibilities.length > 0 && (
            <section className="border-t border-slate-100 pt-6">
              <h2 className="font-display text-lg font-bold text-[#142B4A] mb-3">Tanggung Jawab</h2>
              <ul className="space-y-2.5 text-sm text-slate-700 list-disc pl-5">
                {internship.responsibilities.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {internship.qualifications.length > 0 && (
            <section className="border-t border-slate-100 pt-6">
              <h2 className="font-display text-lg font-bold text-[#142B4A] mb-3">Kualifikasi</h2>
              <ul className="space-y-2.5 text-sm text-slate-700 list-disc pl-5">
                {internship.qualifications.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {internship.benefits.length > 0 && (
            <section className="border-t border-slate-100 pt-6">
              <h2 className="font-display text-lg font-bold text-[#142B4A] mb-3">Benefit & Fasilitas</h2>
              <ul className="space-y-2.5 text-sm text-slate-700 list-disc pl-5">
                {internship.benefits.map((item, idx) => (
                  <li key={idx} className="leading-relaxed">
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside className="lg:col-span-4 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
            <div>
              <h3 className="font-display text-sm font-bold text-[#142B4A] mb-2">Keterampilan Dicari</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {internship.requiredSkills.length > 0 ? internship.requiredSkills.join(' · ') : 'Terbuka umum'}
              </p>
            </div>
            <div className="border-t border-slate-100 pt-4">
              <h3 className="font-display text-sm font-bold text-[#142B4A] mb-2">Jurusan Relevan</h3>
              <p className="text-sm text-slate-700 leading-relaxed">
                {internship.targetMajors.length > 0 ? internship.targetMajors.join(' · ') : 'Semua Jurusan'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="font-display text-base font-bold text-[#142B4A]">Tentang {company.companyName}</h3>
            <p className="mt-2 text-sm text-slate-600 leading-relaxed">{company.description}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-1">
              <p>Ukuran Tim: {company.companySize}</p>
              <p>Kantor Pusat: {company.location}</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'company-profile', slug: company.slug })}
              className="mt-4 w-full rounded-lg border border-slate-300 py-2 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors cursor-pointer"
            >
              Lihat Profil Lengkap Perusahaan
            </button>
          </div>
        </aside>
      </div>

      {/* Application Modal */}
      {applyModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-[#142B4A]">Ajukan Lamaran Magang</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {internship.title} · {company.companyName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setApplyModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApplication} className="p-6 space-y-4">
              {applyError && (
                <div className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700">
                  {applyError}
                </div>
              )}

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="h-5 w-5 text-[#142B4A] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-[#142B4A]">Berkas CV (PDF)</p>
                      <p className="text-xs text-slate-500 truncate">
                        {studentProfile?.cvFilename || 'Belum ada CV terunggah di profil Anda'}
                      </p>
                    </div>
                  </div>
                  <label className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer shrink-0">
                    <Upload className="h-3.5 w-3.5" />
                    <span>{cvUploading ? 'Mengunggah...' : studentProfile?.cvFilename ? 'Ganti CV' : 'Unggah PDF'}</span>
                    <input
                      type="file"
                      accept=".pdf,application/pdf"
                      className="sr-only"
                      onChange={handleCvUploadInModal}
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Tautan Portofolio / GitHub / LinkedIn (Opsional)
                </label>
                <input
                  type="url"
                  value={portfolioUrl}
                  onChange={(e) => setPortfolioUrl(e.target.value)}
                  placeholder="https://github.com/username atau https://behance.net/..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Surat Lamaran & Motivasi Singkat (min. 20 karakter)
                </label>
                <textarea
                  required
                  minLength={20}
                  rows={4}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  placeholder="Jelaskan ketertarikan Anda pada posisi ini dan proyek atau pengalaman relevan yang pernah Anda kerjakan..."
                  className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#3B82F6] focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setApplyModalOpen(false)}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#142B4A] px-5 py-2 text-sm font-semibold text-white hover:bg-[#1e3d68] disabled:opacity-60 cursor-pointer"
                >
                  {submitting ? 'Mengirim...' : 'Kirim Lamaran'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
