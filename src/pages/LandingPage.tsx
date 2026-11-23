import React, { useEffect, useState } from 'react';
import {
  Search,
  MapPin,
  ArrowRight,
  Code2,
  Palette,
  BarChart3,
  Megaphone,
  Layers,
  Calculator,
  Users,
  TrendingUp,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';
import type { Category, CompanyProfile, Internship } from '../types';
import type { AppRoute } from '../components/Navbar';
import { InternshipCard } from '../components/InternshipCard';
import { CompanyAvatar } from '../components/CompanyAvatar';
import { useAuth } from '../context/AuthContext';

interface OverviewResponse {
  stats: {
    activeInternships: number;
    verifiedCompanies: number;
    registeredStudents: number;
    categoriesCount: number;
  };
  categories: Category[];
  latestInternships: Internship[];
  partnerCompanies: CompanyProfile[];
}

const CATEGORY_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2,
  Palette,
  BarChart3,
  Megaphone,
  Layers,
  Calculator,
  Users,
  TrendingUp,
  Briefcase,
};

export const LandingPage: React.FC<{
  onNavigate: (r: AppRoute) => void;
}> = ({ onNavigate }) => {
  const { user, apiFetch, openAuthModal } = useAuth();
  const [data, setData] = useState<OverviewResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [query, setQuery] = useState('');
  const [location, setLocation] = useState('');
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const fetchOverview = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<OverviewResponse>('/api/overview');
      setData(res);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data beranda.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, [user?.id]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onNavigate({
      name: 'search',
      initialQuery: query.trim(),
      initialLocation: location.trim(),
    });
  };

  const handleToggleSave = async (internshipId: number) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (user.role !== 'mahasiswa') {
      return;
    }
    try {
      const res = await apiFetch<{ saved: boolean }>(`/api/internships/${internshipId}/save`, {
        method: 'POST',
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              latestInternships: prev.latestInternships.map((item) =>
                item.id === internshipId ? { ...item, isSaved: res.saved } : item
              ),
            }
          : prev
      );
    } catch {
      // Ignore transient error
    }
  };

  return (
    <div>
      {/* Hero Section */}
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-semibold tracking-wide text-[#3B82F6] uppercase mb-3">
                Platform Karier Mahasiswa & Fresh Graduate Indonesia
              </p>
              <h1
                className="font-display font-extrabold text-[#142B4A] tracking-tight leading-[1.12] max-w-2xl"
                style={{ fontSize: 'clamp(2.25rem, 3.8vw, 3.5rem)', textWrap: 'balance' }}
              >
                Temukan Magang Impianmu, Mulai Kariermu Bersama MagangKeren.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
                MagangKeren mempertemukan mahasiswa dan fresh graduate dengan program magang berstruktur dari perusahaan teknologi serta industri terverifikasi—lengkap dengan pelacakan lamaran real-time dan jadwal wawancara terpusat.
              </p>

              {/* Search Bar */}
              <form
                onSubmit={handleHeroSearch}
                className="mt-8 rounded-xl border border-slate-200 bg-[#F8FAFC] p-2 sm:p-2.5 flex flex-col sm:flex-row items-stretch sm:items-center gap-2"
              >
                <div className="flex items-center gap-2.5 flex-1 bg-white rounded-lg border border-slate-200 px-3.5 py-2.5">
                  <Search className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Posisi, keahlian, atau perusahaan..."
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
                <div className="flex items-center gap-2.5 sm:w-48 bg-white rounded-lg border border-slate-200 px-3.5 py-2.5">
                  <MapPin className="h-4 w-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Lokasi (Jakarta, WFH)"
                    className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
                  />
                </div>
                <button
                  type="submit"
                  className="rounded-lg bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Cari Program Magang
                </button>
              </form>

              <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500">
                <span>Pencarian populer:</span>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search', initialQuery: 'Frontend' })}
                  className="font-medium text-[#142B4A] hover:text-[#3B82F6] transition-colors cursor-pointer"
                >
                  Frontend Engineer
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search', initialQuery: 'UI/UX' })}
                  className="font-medium text-[#142B4A] hover:text-[#3B82F6] transition-colors cursor-pointer"
                >
                  UI/UX Design
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search', initialQuery: 'Data' })}
                  className="font-medium text-[#142B4A] hover:text-[#3B82F6] transition-colors cursor-pointer"
                >
                  Data Analyst
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search', initialQuery: 'Product' })}
                  className="font-medium text-[#142B4A] hover:text-[#3B82F6] transition-colors cursor-pointer"
                >
                  Product Management
                </button>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="relative h-72 sm:h-88 lg:h-full min-h-[320px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
                {!heroImgFailed ? (
                  <img
                    src="/src/assets/images/hero_students_workspace_1795414993261.jpg"
                    alt="Mahasiswa dan tim profesional muda berkolaborasi di ruang kerja teknologi modern"
                    referrerPolicy="no-referrer"
                    onError={() => setHeroImgFailed(true)}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-br from-[#142B4A] to-[#1E40AF] p-8 text-white text-center">
                    <Briefcase className="h-12 w-12 mb-3 opacity-80" />
                    <p className="font-display text-lg font-bold">MagangKeren Workspace</p>
                    <p className="text-xs text-blue-100 mt-1">Kolaborasi Mahasiswa & Industri Terverifikasi</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 4-column live platform KPI strip below hero split */}
          <div className="mt-12 grid grid-cols-2 lg:grid-cols-4 border-t border-slate-200 pt-8 gap-6">
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#142B4A] tabular-nums">
                {data ? data.stats.activeInternships : '—'}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Program Magang Aktif</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#142B4A] tabular-nums">
                {data ? data.stats.verifiedCompanies : '—'}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Perusahaan Mitra Terverifikasi</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#142B4A] tabular-nums">
                {data ? data.stats.registeredStudents : '—'}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Talenta Mahasiswa Terdaftar</p>
            </div>
            <div>
              <p className="text-2xl sm:text-3xl font-display font-extrabold text-[#142B4A] tabular-nums">
                {data ? data.stats.categoriesCount : '—'}
              </p>
              <p className="mt-1 text-xs sm:text-sm text-slate-600">Bidang Keahlian Karier</p>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-8">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 flex items-center justify-between gap-4">
            <p className="text-sm text-rose-700">{error}</p>
            <button
              type="button"
              onClick={fetchOverview}
              className="rounded-lg bg-rose-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
            >
              Muat Ulang
            </button>
          </div>
        </div>
      )}

      {/* Kategori Magang Populer */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              Kategori Magang Populer
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-xl">
              Telusuri bidang karier yang sesuai dengan jurusan kuliah dan minat profesional Anda.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'search' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B82F6] hover:text-[#142B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Lihat semua kategori</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-28 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {data?.categories.map((cat) => {
              const Icon = CATEGORY_ICON_MAP[cat.iconName] || Briefcase;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onNavigate({ name: 'search', initialCategory: cat.slug })}
                  className="group text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-[#3B82F6] transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#F8FAFC] border border-slate-200 text-[#142B4A] group-hover:bg-[#142B4A] group-hover:text-white transition-colors">
                      <Icon className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-mono font-medium text-slate-500 tabular-nums">
                      {cat.internshipCount ?? 0} posisi
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-bold text-[#142B4A] group-hover:text-[#3B82F6] transition-colors">
                    {cat.name}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {/* Lowongan Magang Terbaru */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
                Lowongan Magang Terbaru
              </h2>
              <p className="mt-2 text-sm text-slate-600 max-w-xl">
                Posisi magang terkurasi dengan informasi uang saku, sistem kerja, dan durasi yang transparan.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'search' })}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-[#142B4A] hover:border-[#3B82F6] hover:text-[#3B82F6] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <span>Jelajahi Semua Lowongan</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-56 rounded-xl border border-slate-200 bg-[#F8FAFC] p-5 animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {data?.latestInternships.map((job) => (
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
      </section>

      {/* Perusahaan Mitra */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              Perusahaan Mitra Terverifikasi
            </h2>
            <p className="mt-2 text-sm text-slate-600 max-w-xl">
              Setiap mitra melalui proses verifikasi resmi untuk memastikan lingkungan belajar dan bimbingan mentor yang nyata.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate({ name: 'companies' })}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#3B82F6] hover:text-[#142B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span>Lihat semua perusahaan</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data?.partnerCompanies.map((company) => (
            <button
              key={company.id}
              type="button"
              onClick={() => onNavigate({ name: 'company-profile', slug: company.slug })}
              className="group text-left rounded-xl border border-slate-200 bg-white p-5 hover:border-[#3B82F6] transition-colors cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3.5 min-w-0">
                  <CompanyAvatar name={company.companyName} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h3 className="font-display text-base font-bold text-[#142B4A] group-hover:text-[#3B82F6] truncate transition-colors">
                        {company.companyName}
                      </h3>
                      <ShieldCheck className="h-4 w-4 text-[#22C55E] shrink-0" />
                    </div>
                    <p className="text-xs text-slate-500 truncate">{company.industry}</p>
                  </div>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600 line-clamp-2 leading-relaxed">{company.description}</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>{company.location} · {company.companySize}</span>
                <span className="font-semibold text-[#3B82F6] tabular-nums">
                  {company.activeInternshipsCount ?? 0} lowongan
                </span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Cara Kerja Platform */}
      <section className="border-y border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-10">
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
              Cara Kerja MagangKeren
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Alur seleksi transparan dari pengisian profil hingga penjadwalan wawancara langsung di satu dashboard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: '01',
                title: 'Lengkapi Profil & CV PDF',
                desc: 'Daftarkan akun mahasiswa dengan email kampus, isi jurusan, pengalaman organisasi, keterampilan, dan unggah CV PDF serta portofolio.',
              },
              {
                step: '02',
                title: 'Temukan Lowongan Relevan',
                desc: 'Gunakan pencarian cerdas dan filter sistem kerja, durasi, serta uang saku—atau cek rekomendasi otomatis sesuai jurusan Anda.',
              },
              {
                step: '03',
                title: 'Lamar & Pantau Real-Time',
                desc: 'Kirim lamaran dalam satu klik dan pantau status dari Menunggu Review, Diproses, hingga Interview secara langsung.',
              },
              {
                step: '04',
                title: 'Ikuti Interview & Mulai Magang',
                desc: 'Terima notifikasi jadwal wawancara lengkap dengan tautan meeting atau alamat kantor langsung dari tim HR perusahaan.',
              },
            ].map((item) => (
              <div key={item.step} className="rounded-xl border border-slate-200 bg-[#F8FAFC] p-6">
                <span className="font-mono text-sm font-semibold text-[#3B82F6] tabular-nums">{item.step}.</span>
                <h3 className="mt-3 font-display text-base font-bold text-[#142B4A]">{item.title}</h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimoni Pengguna */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-2xl mb-10">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
            Cerita Mahasiswa & Alumni Program
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            Pengalaman nyata kandidat yang mendapatkan kesempatan magang terstruktur melalui MagangKeren.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between">
            <p className="text-base text-slate-700 leading-relaxed">
              “Sebelumnya saya kesulitan melacak puluhan lamaran magang lewat email yang tidak kunjung dibalas. Di MagangKeren, saya mendapat rekomendasi posisi Frontend Engineer yang sesuai keterampilan React saya dan langsung menerima jadwal live walkthrough dari FinPay dalam empat hari.”
            </p>
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
              <img
                src="/src/assets/images/testimonial_nadia_putri_1795414994367.jpg"
                alt="Nadia Putri Maharani"
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div>
                <p className="font-display text-sm font-bold text-[#142B4A]">Nadia Putri Maharani</p>
                <p className="text-xs text-slate-500">
                  Teknik Informatika, Universitas Indonesia · Frontend Intern di FinPay Nusantara
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6 sm:p-8 flex flex-col justify-between">
            <p className="text-base text-slate-700 leading-relaxed">
              “Fitur unggah portofolio dan CV PDF di profil mahasiswa membuat saya tidak perlu mengulang pengisian formulir panjang setiap kali melamar. Setelah dua minggu proses seleksi di Aksara Studio, saya resmi diterima sebagai UI/UX Design Intern.”
            </p>
            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-4">
              <img
                src="/src/assets/images/testimonial_bagas_pratama_1795414993240.jpg"
                alt="Bagas Pratama Wijaya"
                referrerPolicy="no-referrer"
                className="h-12 w-12 rounded-full object-cover border border-slate-200 shrink-0"
              />
              <div>
                <p className="font-display text-sm font-bold text-[#142B4A]">Bagas Pratama Wijaya</p>
                <p className="text-xs text-slate-500">
                  Desain Komunikasi Visual, ITB · UI/UX Design Intern di Aksara Studio
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-6">
        <div className="rounded-2xl bg-[#142B4A] px-6 py-10 sm:px-12 sm:py-12 text-white flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
              Siap Memulai Langkah Pertama Karier Profesionalmu?
            </h2>
            <p className="mt-2.5 text-sm sm:text-base text-slate-300 leading-relaxed">
              Buat akun mahasiswa untuk melamar program magang terkurasi, atau daftarkan perusahaan Anda untuk menjangkau talenta terbaik dari universitas di seluruh Indonesia.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openAuthModal('register')}
              className="rounded-lg bg-[#3B82F6] px-5 py-3 text-sm font-semibold text-white hover:bg-blue-500 transition-colors whitespace-nowrap cursor-pointer"
            >
              Daftar Gratis Sekarang
            </button>
            <button
              type="button"
              onClick={() => onNavigate({ name: 'search' })}
              className="rounded-lg border border-slate-500 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors whitespace-nowrap cursor-pointer"
            >
              Telusuri Lowongan
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
