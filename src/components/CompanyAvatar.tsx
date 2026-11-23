import React from 'react';

const PALETTES = [
  { bg: 'bg-[#142B4A]', text: 'text-white' },
  { bg: 'bg-[#1E40AF]', text: 'text-white' },
  { bg: 'bg-[#0F766E]', text: 'text-white' },
  { bg: 'bg-[#334155]', text: 'text-white' },
  { bg: 'bg-[#1D4ED8]', text: 'text-white' },
  { bg: 'bg-[#0369A1]', text: 'text-white' },
];

export const CompanyAvatar: React.FC<{
  name: string;
  size?: 'sm' | 'md' | 'lg';
}> = ({ name, size = 'md' }) => {
  const words = name.trim().split(/\s+/);
  const initials =
    words.length >= 2
      ? `${words[0][0] || ''}${words[1][0] || ''}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();

  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const palette = PALETTES[Math.abs(hash) % PALETTES.length];

  const sizeClass =
    size === 'sm'
      ? 'h-9 w-9 text-xs rounded-lg'
      : size === 'lg'
      ? 'h-16 w-16 text-xl rounded-xl'
      : 'h-11 w-11 text-sm rounded-lg';

  return (
    <div
      className={`${sizeClass} ${palette.bg} ${palette.text} font-display font-bold flex items-center justify-center shrink-0 tracking-tight select-none`}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
};
