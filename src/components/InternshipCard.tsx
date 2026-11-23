import React from 'react';
import { Bookmark, ArrowUpRight, ShieldCheck } from 'lucide-react';
import type { Internship } from '../types';
import { CompanyAvatar } from './CompanyAvatar';
import { formatIndonesianDate } from './StatusIndicator';

export const InternshipCard: React.FC<{
  internship: Internship;
  onOpenDetail: (id: number) => void;
  onOpenCompany: (slug: string) => void;
  onToggleSave?: (id: number) => void;
}> = ({ internship, onOpenDetail, onOpenCompany, onToggleSave }) => {
  return (
    <article className="group flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-[#3B82F6]/60">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5 min-w-0">
            <CompanyAvatar name={internship.companyName} size="md" />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <button
                  type="button"
                  onClick={() => onOpenCompany(internship.companySlug)}
                  className="font-medium hover:text-[#3B82F6] transition-colors truncate cursor-pointer"
                >
                  {internship.companyName}
                </button>
                {internship.companyVerifiedStatus === 'verified' && (
                  <ShieldCheck
                    className="h-3.5 w-3.5 text-[#22C55E] shrink-0"
                    aria-label="Perusahaan Terverifikasi"
                  />
                )}
              </div>
              <h3 className="mt-1 font-display text-base font-bold text-[#142B4A] leading-snug group-hover:text-[#3B82F6] transition-colors">
                <button
                  type="button"
                  onClick={() => onOpenDetail(internship.id)}
                  className="text-left cursor-pointer"
                >
                  {internship.title}
                </button>
              </h3>
            </div>
          </div>

          {onToggleSave && (
            <button
              type="button"
              onClick={() => onToggleSave(internship.id)}
              aria-label={internship.isSaved ? 'Hapus dari lowongan tersimpan' : 'Simpan lowongan'}
              className={`rounded-lg p-2 transition-colors shrink-0 cursor-pointer ${
                internship.isSaved
                  ? 'text-[#3B82F6] bg-blue-50'
                  : 'text-slate-400 hover:bg-slate-100 hover:text-slate-700'
              }`}
            >
              <Bookmark className={`h-4 w-4 ${internship.isSaved ? 'fill-current' : ''}`} />
            </button>
          )}
        </div>

        {/* Clean unboxed metadata with typographic separators (zero-pill discipline) */}
        <div className="mt-3.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 tabular-nums">
          <span>{internship.location}</span>
          <span aria-hidden="true">·</span>
          <span className="font-medium text-[#1E293B]">{internship.workMode}</span>
          <span aria-hidden="true">·</span>
          <span>{internship.durationMonths} Bulan</span>
        </div>

        <div className="mt-2 text-sm font-semibold text-[#142B4A] tabular-nums">
          {internship.stipendLabel}
        </div>

        {internship.matchReasons && internship.matchReasons.length > 0 && (
          <p className="mt-2 text-xs font-medium text-[#22C55E]">
            Rekomendasi: {internship.matchReasons[0]}
          </p>
        )}

        {internship.requiredSkills.length > 0 && (
          <p className="mt-3 text-xs text-slate-500 line-clamp-1">
            {internship.requiredSkills.slice(0, 4).join(' · ')}
          </p>
        )}
      </div>

      <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-3">
        <span className="text-xs text-slate-500 tabular-nums">
          Diposting {formatIndonesianDate(internship.createdAt)}
        </span>
        <button
          type="button"
          onClick={() => onOpenDetail(internship.id)}
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#3B82F6] hover:text-[#142B4A] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <span>{internship.hasApplied ? 'Sudah Dilamar' : 'Lihat Detail'}</span>
          <ArrowUpRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
};
