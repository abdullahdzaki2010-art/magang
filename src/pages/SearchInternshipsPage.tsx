import React, { useCallback, useEffect, useState } from 'react';
import { Search, SlidersHorizontal, RotateCcw } from 'lucide-react';
import type { Category, CompanyProfile, Internship } from '../types';
import type { AppRoute } from '../components/Navbar';
import { InternshipCard } from '../components/InternshipCard';
import { useAuth } from '../context/AuthContext';

export const SearchInternshipsPage: React.FC<{
  initialQuery?: string;
  initialCategory?: string;
  initialLocation?: string;
  onNavigate: (r: AppRoute) => void;
}> = ({ initialQuery = '', initialCategory = 'all', initialLocation = '', onNavigate }) => {
  const { user, apiFetch, openAuthModal } = useAuth();

  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory || 'all');
  const [location, setLocation] = useState(initialLocation);
  const [workMode, setWorkMode] = useState('all');
  const [duration, setDuration] = useState('all');
  const [stipend, setStipend] = useState('all');
  const [company, setCompany] = useState('all');
  const [sort, setSort] = useState<'newest' | 'relevance'>('newest');

  const [categories, setCategories] = useState<Category[]>([]);
  const [companies, setCompanies] = useState<CompanyProfile[]>([]);
  const [results, setResults] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
    setCategory(initialCategory || 'all');
    setLocation(initialLocation);
  }, [initialQuery, initialCategory, initialLocation]);

  useEffect(() => {
    Promise.all([
      apiFetch<Category[]>('/api/categories'),
      apiFetch<CompanyProfile[]>('/api/companies'),
    ])
      .then(([cats, comps]) => {
        setCategories(cats);
        setCompanies(comps);
      })
      .catch(() => {});
  }, [apiFetch]);

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (category !== 'all') params.set('category', category);
      if (location.trim() && location !== 'all') params.set('location', location.trim());
      if (workMode !== 'all') params.set('workMode', workMode);
      if (duration !== 'all') params.set('duration', duration);
      if (stipend !== 'all') params.set('stipend', stipend);
      if (company !== 'all') params.set('company', company);
      params.set('sort', sort);

      const data = await apiFetch<Internship[]>(`/api/internships?${params.toString()}`);
      setResults(data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat daftar lowongan.');
    } finally {
      setLoading(false);
    }
  }, [apiFetch, query, category, location, workMode, duration, stipend, company, sort, user?.id]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchResults();
    }, 150);
    return () => clearTimeout(timer);
  }, [fetchResults]);

  const handleReset = () => {
    setQuery('');
    setCategory('all');
    setLocation('');
    setWorkMode('all');
    setDuration('all');
    setStipend('all');
    setCompany('all');
    setSort('newest');
  };

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
      setResults((prev) =>
        prev.map((item) => (item.id === internshipId ? { ...item, isSaved: res.saved } : item))
      );
    } catch {
      // Ignore
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
      <div className="border-b border-slate-200 pb-6 mb-8">
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#142B4A] tracking-tight">
          Cari Program Magang
        </h1>
        <p className="mt-1.5 text-sm text-slate-600">
          Saring peluang magang berdasarkan kategori, lokasi, sistem kerja, durasi, uang saku, dan perusahaan mitra.
        </p>

        {/* Top Search & Sort Row */}
        <div className="mt-6 flex flex-col md:flex-row gap-3">
          <div className="flex-1 flex items-center gap-2.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 focus-within:border-[#3B82F6] focus-within:ring-2 focus-within:ring-[#3B82F6]/20">
            <Search className="h-4 w-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari nama posisi, keahlian (React, Figma, SQL), atau perusahaan..."
              className="w-full text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none bg-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-xs font-semibold text-slate-600 whitespace-nowrap">
              Urutkan:
            </label>
            <select
              id="sort-select"
              value={sort}
              onChange={(e) => setSort(e.target.value as 'newest' | 'relevance')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-[#142B4A] focus:border-[#3B82F6] focus:outline-none"
            >
              <option value="newest">Terbaru</option>
              <option value="relevance">Relevansi & Uang Saku</option>
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Filter Sidebar */}
        <aside className="lg:col-span-3 space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-[#142B4A]">
                <SlidersHorizontal className="h-4 w-4 text-[#3B82F6]" />
                <span>Filter Lowongan</span>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-[#142B4A] cursor-pointer"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Reset</span>
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Kategori Pekerjaan</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B82F6] focus:outline-none"
              >
                <option value="all">Semua Kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Lokasi</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Jakarta, Bandung, Surabaya..."
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B82F6] focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Sistem Kerja</label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                {(['all', 'WFO', 'WFH', 'Hybrid'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setWorkMode(mode)}
                    className={`rounded-md py-1.5 text-xs font-semibold transition-colors cursor-pointer ${
                      workMode === mode
                        ? 'bg-white text-[#142B4A] shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {mode === 'all' ? 'Semua' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Durasi Magang</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B82F6] focus:outline-none"
              >
                <option value="all">Semua Durasi</option>
                <option value="1-3">1 – 3 Bulan</option>
                <option value="4-6">4 – 6 Bulan</option>
                <option value="6+">Lebih dari 6 Bulan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Uang Saku</label>
              <select
                value={stipend}
                onChange={(e) => setStipend(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B82F6] focus:outline-none"
              >
                <option value="all">Semua</option>
                <option value="paid">Berbayar (Paid)</option>
                <option value="2m">Minimal Rp 2.000.000</option>
                <option value="4m">Minimal Rp 4.000.000</option>
                <option value="unpaid">Unpaid / Konversi SKS</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Perusahaan</label>
              <select
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 focus:border-[#3B82F6] focus:outline-none"
              >
                <option value="all">Semua Perusahaan</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.companyName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </aside>

        {/* Results Grid */}
        <div className="lg:col-span-9">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-600">
            <span className="tabular-nums">
              Menampilkan <strong className="text-[#142B4A]">{results.length}</strong> program magang
            </span>
          </div>

          {error ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center">
              <p className="text-sm font-medium text-rose-700">{error}</p>
              <button
                type="button"
                onClick={fetchResults}
                className="mt-3 rounded-lg bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
              >
                Coba Lagi
              </button>
            </div>
          ) : loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {Array.from({ length: 6 }).map((_, idx) => (
                <div key={idx} className="h-56 rounded-xl border border-slate-200 bg-white p-5 animate-pulse" />
              ))}
            </div>
          ) : results.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
              <h3 className="font-display text-lg font-bold text-[#142B4A]">
                Tidak Ada Lowongan yang Cocok
              </h3>
              <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
                Coba ubah kata kunci pencarian atau reset sebagian filter lokasi, durasi, maupun uang saku.
              </p>
              <button
                type="button"
                onClick={handleReset}
                className="mt-5 rounded-lg bg-[#142B4A] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#1e3d68] cursor-pointer"
              >
                Reset Semua Filter
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {results.map((job) => (
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
      </div>
    </div>
  );
};
