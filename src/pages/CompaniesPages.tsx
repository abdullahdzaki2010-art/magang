import React, { useEffect, useState } from 'react';
import { ArrowLeft, ExternalLink, Search, ShieldCheck, Building2, CheckCircle2 } from 'lucide-react';
import type { CompanyProfile, Internship } from '../types';
import type { AppRoute } from '../components/Navbar';
import { CompanyAvatar } from '../components/CompanyAvatar';
import { InternshipCard } from '../components/InternshipCard';
import { VerifiedCompanyLabel } from '../components/StatusIndicator';
import { useAuth } from '../context/AuthContext';

export const CompaniesPage: React.FC<{ onNavigate: (r: AppRoute) => void }> = ({ onNavigate }) => {
  const { apiFetch } = useAuth();
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const url = query.trim()
      ? `/api/companies?q=${encodeURIComponent(query.trim())}`
      : '/api/companies';
    apiFetch<CompanyProfile[]>(url)
      .then(setCompanies)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [query, apiFetch]);

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
            Perusahaan Mitra MagangKeren
          </h1>
          <p className="mt-1.5 text-sm text-slate-600 max-w-2xl">
            Jelajahi profil perusahaan teknologi dan korporasi terverifikasi yang membuka kesempatan magang terstruktur.
          </p>
        </div>

        <div className="flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 w-full md:w-80">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cari nama perusahaan atau industri..."
            className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
          />
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="h-48 rounded-xl border border-slate-200 bg-white animate-pulse" />
          ))}
        </div>
      ) : companies.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <Building2 className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <h2 className="font-display text-lg font-bold text-[#142B4A]">Perusahaan Tidak Ditemukan</h2>
          <p className="mt-1 text-sm text-slate-500">Coba ubah kata kunci pencarian Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {companies.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onNavigate({ name: 'company-profile', slug: c.slug })}
              className="group text-left rounded-xl border border-slate-200 bg-white p-6 hover:border-[#3B82F6] transition-colors flex flex-col justify-between cursor-pointer"
            >
              <div>
                <div className="flex items-start gap-3.5">
                  <CompanyAvatar name={c.companyName} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h2 className="font-display text-base font-bold text-[#142B4A] group-hover:text-[#3B82F6] truncate transition-colors">
                        {c.companyName}
                      </h2>
                      <ShieldCheck className="h-4 w-4 text-[#22C55E] shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 truncate mt-0.5">{c.industry}</p>
                  </div>
                </div>
                <p className="mt-3.5 text-sm text-slate-600 line-clamp-3 leading-relaxed">{c.description}</p>
              </div>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{c.location} · {c.companySize}</span>
                <span className="font-semibold text-[#3B82F6] tabular-nums">
                  {c.activeInternshipsCount ?? 0} lowongan aktif
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const CompanyPublicProfilePage: React.FC<{
  slug: string;
  onNavigate: (r: AppRoute) => void;
}> = ({ slug, onNavigate }) => {
  const { user, apiFetch, openAuthModal } = useAuth();
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    apiFetch<{ company: CompanyProfile; internships: Internship[] }>(`/api/companies/${slug}`)
      .then((res) => {
        setCompany(res.company);
        setInternships(res.internships);
      })
      .catch((err: any) => setError(err.message || 'Gagal memuat profil perusahaan.'))
      .finally(() => setLoading(false));
  }, [slug, apiFetch, user?.id]);

  const handleToggleSave = async (internshipId: number) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (user.role !== 'mahasiswa') return;
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/internships/${internshipId}/save`, {
        method: 'POST',
      });
      setInternships((prev) =>
        prev.map((j) => (j.id === internshipId ? { ...j, isSaved: res.saved } : j))
      );
    } catch {
      // Ignore
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
        <div className="h-64 rounded-xl border border-slate-200 bg-white animate-pulse" />
      </div>
    );
  }

  if (error || !company) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-12 text-center">
        <p className="text-sm text-rose-700">{error || 'Perusahaan tidak ditemukan.'}</p>
        <button
          type="button"
          onClick={() => onNavigate({ name: 'companies' })}
          className="mt-4 rounded-lg bg-[#142B4A] px-4 py-2 text-xs font-semibold text-white cursor-pointer"
        >
          Kembali ke Daftar Perusahaan
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-10">
      <button
        type="button"
        onClick={() => onNavigate({ name: 'companies' })}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-[#142B4A] mb-6 cursor-pointer"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Semua Perusahaan Mitra</span>
      </button>

      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        <div className="h-44 sm:h-56 w-full bg-slate-100 relative">
          <img
            src={company.bannerUrl || '/src/assets/images/company_modern_office_1795414992957.jpg'}
            alt={`Suasana kantor ${company.companyName}`}
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/50 via-transparent to-transparent" />
        </div>

        <div className="p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <CompanyAvatar name={company.companyName} size="lg" />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A]">
                    {company.companyName}
                  </h1>
                  <VerifiedCompanyLabel status={company.verifiedStatus} />
                </div>
                <p className="mt-1 text-sm text-slate-600">
                  {company.industry} · {company.location} · {company.companySize}
                </p>
              </div>
            </div>

            {company.website && (
              <a
                href={company.website}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-[#142B4A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors shrink-0"
              >
                <span>Kunjungi Situs Resmi</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          <div className="mt-6 border-t border-slate-100 pt-6">
            <h2 className="font-display text-base font-bold text-[#142B4A] mb-2">Tentang Perusahaan</h2>
            <p className="text-sm sm:text-base text-slate-700 leading-relaxed max-w-3xl">
              {company.description || 'Profil perusahaan belum ditambahkan.'}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10">
        <h2 className="font-display text-xl font-bold text-[#142B4A] mb-5 tabular-nums">
          Program Magang Tersedia ({internships.length})
        </h2>

        {internships.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
            Saat ini belum ada program magang aktif yang dibuka oleh {company.companyName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {internships.map((job) => (
              <InternshipCard
                key={job.id}
                internship={job}
                onOpenDetail={(id) => onNavigate({ name: 'internship', id })}
                onOpenCompany={(s) => onNavigate({ name: 'company-profile', slug: s })}
                onToggleSave={handleToggleSave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export const AboutPage: React.FC<{ onNavigate: (r: AppRoute) => void }> = ({ onNavigate }) => {
  const { openAuthModal } = useAuth();

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center">
          <p className="text-xs font-semibold uppercase tracking-wide text-[#3B82F6] mb-2">
            Tentang MagangKeren
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#142B4A] tracking-tight leading-tight">
            Membangun Jembatan Karier Mahasiswa dan Industri Indonesia
          </h1>
          <p className="mt-4 text-base text-slate-600 leading-relaxed">
            MagangKeren hadir untuk menyelesaikan kesenjangan informasi antara mahasiswa pencari pengalaman kerja nyata dan perusahaan yang membutuhkan talenta muda berpotensi. Setiap mitra melewati verifikasi manual oleh tim kami agar setiap program magang memiliki bimbingan mentor dan kejelasan hak peserta.
          </p>

          <ul className="mt-6 space-y-3 text-sm text-slate-700">
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
              <span>Transparansi uang saku, sistem kerja (WFO/WFH/Hybrid), durasi, dan jadwal seleksi sejak awal.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
              <span>Sistem rekomendasi cerdas berbasis jurusan akademik dan keterampilan mahasiswa.</span>
            </li>
            <li className="flex items-start gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-[#22C55E] shrink-0" />
              <span>Dashboard manajemen pelamar dan penjadwalan wawancara terintegrasi untuk tim HR perusahaan.</span>
            </li>
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'search' })}
              className="rounded-lg bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
            >
              Cari Program Magang
            </button>
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-[#142B4A] hover:border-[#3B82F6] cursor-pointer"
            >
              Gabung Sebagai Mitra
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="h-80 lg:h-full rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
            <img
              src="/src/assets/images/company_modern_office_1795414992957.jpg"
              alt="Lingkungan kerja perusahaan mitra MagangKeren"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
