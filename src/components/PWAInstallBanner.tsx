import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Download, X, Share2, PlusSquare, CheckCircle2, Smartphone } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isDismissed, install, dismiss } = usePWAInstall();
  const [isInstalling, setIsInstalling] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  // 1. MUTLAK: Hilangkan notif mengambang jika di perangkat sudah terinstal atau ditutup
  if (isInstalled || isDismissed) {
    return null;
  }

  // 2. Pada Android / Desktop: Jangan tampilkan banner sebelum event prompt siap,
  // sehingga begitu tombol diklik, DIJAMIN 1 KALI KLIK LANGSUNG MUNCULKAN PROMPT INSTAL RESMI
  if (!isIOS && !isInstallable) {
    return null;
  }

  const handleDirectInstall = async () => {
    if (isIOS) {
      setShowIOSModal(true);
      return;
    }

    setIsInstalling(true);
    try {
      // 1 Kali Klik Langsung Jalankan Native Browser Install
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        <motion.div
          key="pwa-floating-banner"
          aria-label="Notifikasi Instal Aplikasi"
          initial={{ y: 60, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 60, opacity: 0, scale: 0.95 }}
          transition={{ type: 'spring', stiffness: 450, damping: 32 }}
          className="fixed bottom-4 inset-x-0 mx-auto z-50 max-w-[345px] w-[calc(100%-24px)] pointer-events-auto select-none"
        >
          <div className="bg-slate-950/95 dark:bg-slate-950/95 text-white border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-md p-2.5 flex items-center justify-between gap-2.5">
            {/* Logo & Info Singkat */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative shrink-0 w-9 h-9 rounded-xl overflow-hidden shadow-inner border border-emerald-400/40 bg-slate-900 flex items-center justify-center p-1">
                <img
                  src="/logo.svg"
                  alt="Wali Asuh"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1">
                  <Smartphone className="w-3 h-3 text-emerald-400 shrink-0" />
                  <p className="text-xs font-bold text-slate-100 truncate leading-tight">
                    Aplikasi Wali Asuh
                  </p>
                </div>
                <p className="text-[10px] text-emerald-300 truncate leading-tight mt-0.5">
                  1-Klik Pasang di Layar HP
                </p>
              </div>
            </div>

            {/* Tombol Aksi Langsung (1-Klik Langsung Terinstal) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                id="btn-pwa-direct-install"
                type="button"
                onClick={handleDirectInstall}
                disabled={isInstalling}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-md shadow-emerald-950/40 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 shrink-0 animate-bounce" />
                <span>{isInstalling ? 'Memasang...' : 'Instal'}</span>
              </button>

              <button
                type="button"
                onClick={dismiss}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
                title="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Petunjuk Khusus Pengguna iOS Safari (Jika Dibuka di iPhone/iPad) */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 shadow-2xl space-y-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <img src="/logo.svg" alt="App Icon" className="w-7 h-7 rounded-lg" />
                <h3 className="font-bold text-sm text-white">
                  Instal ke Layar Utama iPhone
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 text-slate-400 hover:text-slate-200 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-slate-300">
              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  1
                </div>
                <p className="leading-snug">
                  Tekan ikon menu <strong>Share / Bagikan</strong> <Share2 className="w-3.5 h-3.5 inline mx-0.5 text-blue-400" /> pada browser Safari.
                </p>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80">
                <div className="w-6 h-6 rounded-lg bg-emerald-950 text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs">
                  2
                </div>
                <p className="leading-snug">
                  Gulir ke bawah dan pilih <strong>Tambahkan ke Layar Utama</strong> (<i>Add to Home Screen</i> <PlusSquare className="w-3.5 h-3.5 inline mx-0.5 text-emerald-400" />).
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-emerald-400 pt-1">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Aplikasi akan langsung muncul di menu HP Anda.</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSModal(false)}
              className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </>
  );
};
