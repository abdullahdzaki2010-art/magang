import React from 'react';
import { useAuth } from '../context/AuthContext';
import type { AppRoute } from './Navbar';

export const Footer: React.FC<{ onNavigate: (r: AppRoute) => void }> = ({ onNavigate }) => {
  const { openAuthModal } = useAuth();

  return (
    <footer className="border-t border-slate-200 bg-[#142B4A] text-slate-300 mt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-4">
          <div className="md:col-span-1">
            <button
              type="button"
              onClick={() => onNavigate({ name: 'home' })}
              className="font-display text-xl font-extrabold tracking-tight text-white cursor-pointer"
            >
              Magang<span className="text-[#3B82F6]">Keren</span>
            </button>
            <p className="mt-3 text-sm leading-relaxed text-slate-300">
              Platform karier terstruktur yang menghubungkan mahasiswa dan fresh graduate Indonesia dengan program magang terverifikasi di perusahaan teknologi dan industri terkemuka.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Untuk Mahasiswa</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'search' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Cari Program Magang
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'companies' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Daftar Perusahaan Mitra
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Buat Profil & Unggah CV
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Untuk Perusahaan</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <button
                  type="button"
                  onClick={() => openAuthModal('register')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Daftarkan Perusahaan
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => onNavigate({ name: 'about' })}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Tentang MagangKeren
                </button>
              </li>
              <li>
                <button
                  type="button"
                  onClick={() => openAuthModal('admin')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  Portal Administrator
                </button>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-3">Kontak</h3>
            <ul className="space-y-2 text-sm text-slate-300">
              <li>Menara Sudirman Lt. 12, Jakarta Selatan</li>
              <li>halo@magangkeren.id</li>
              <li className="tabular-nums">+62 21 5550 8420</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-slate-700/70 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>© 2026 MagangKeren. Seluruh hak cipta dilindungi.</p>
          <p>Platform Rekrutmen Magang Terverifikasi Indonesia</p>
        </div>
      </div>
    </footer>
  );
};
