import React from 'react';
import {
  CheckCircle2,
  Clock,
  Eye,
  CalendarClock,
  XCircle,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import type { ApplicationStatus, ModerationStatus, VerifiedStatus } from '../types';

export const ApplicationStatusLabel: React.FC<{ status: ApplicationStatus }> = ({ status }) => {
  const map: Record<
    ApplicationStatus,
    { label: string; colorClass: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    menunggu_review: {
      label: 'Menunggu Review',
      colorClass: 'text-slate-600',
      Icon: Clock,
    },
    diproses: {
      label: 'Diproses',
      colorClass: 'text-[#3B82F6]',
      Icon: Eye,
    },
    interview: {
      label: 'Interview',
      colorClass: 'text-[#D97706]',
      Icon: CalendarClock,
    },
    diterima: {
      label: 'Diterima',
      colorClass: 'text-[#16A34A]',
      Icon: CheckCircle2,
    },
    ditolak: {
      label: 'Ditolak',
      colorClass: 'text-rose-600',
      Icon: XCircle,
    },
  };

  const info = map[status];
  const Icon = info.Icon;

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${info.colorClass} whitespace-nowrap`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{info.label}</span>
    </span>
  );
};

export const VerifiedCompanyLabel: React.FC<{ status: VerifiedStatus }> = ({ status }) => {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#16A34A] whitespace-nowrap">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0" />
        <span>Terverifikasi</span>
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-rose-600 whitespace-nowrap">
        <XCircle className="h-3.5 w-3.5 shrink-0" />
        <span>Ditolak</span>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-[#D97706] whitespace-nowrap">
      <Clock className="h-3.5 w-3.5 shrink-0" />
      <span>Menunggu Verifikasi</span>
    </span>
  );
};

export const ModerationStatusLabel: React.FC<{ status: ModerationStatus }> = ({ status }) => {
  const map: Record<ModerationStatus, { label: string; colorClass: string; Icon: any }> = {
    active: { label: 'Aktif', colorClass: 'text-[#16A34A]', Icon: CheckCircle2 },
    pending: { label: 'Menunggu Moderasi', colorClass: 'text-[#D97706]', Icon: Clock },
    flagged: { label: 'Ditandai', colorClass: 'text-rose-600', Icon: AlertTriangle },
    closed: { label: 'Ditutup', colorClass: 'text-slate-500', Icon: XCircle },
  };
  const info = map[status];
  const Icon = info.Icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${info.colorClass} whitespace-nowrap`}>
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span>{info.label}</span>
    </span>
  );
};

export function formatIndonesianDate(isoOrDate: string): string {
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}
