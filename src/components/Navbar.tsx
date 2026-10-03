import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  Bell, 
  Volume2, 
  VolumeX, 
  Moon, 
  Sun, 
  User, 
  LayoutDashboard, 
  CalendarDays, 
  Sparkles, 
  Printer, 
  Settings,
  ShieldCheck,
  FileText,
  LogOut,
  ArrowLeftRight,
  Database,
  RefreshCw,
  ListTodo,
  Pill,
  HeartPulse,
  Send,
  GraduationCap,
  BookOpen,
  Users,
  RotateCcw
} from 'lucide-react';
import { Staff } from '../types';
import { INSTITUTION_INFO } from '../data/initialSchedule';
import { soundManager } from '../utils/audio';
import { getCurrentTwoHourTheme, TwoHourTheme } from '../utils/themeTwoHour';
import { JapaneseBannerWatermark } from './JapaneseBannerWatermark';
import { isSupabaseConfigured } from '../utils/supabaseService';

interface NavbarProps {
  userRole?: 'admin' | 'staff';
  currentTab: 'dashboard' | 'matrix' | 'codeguide' | 'personal' | 'admin' | 'leave' | 'auto' | 'notifications' | 'print' | 'handover' | 'sop' | 'medical' | 'assignment' | 'portfolio' | 'staff-management';
  setCurrentTab: (tab: 'dashboard' | 'matrix' | 'codeguide' | 'personal' | 'admin' | 'leave' | 'auto' | 'notifications' | 'print' | 'handover' | 'sop' | 'medical' | 'assignment' | 'portfolio' | 'staff-management') => void;
  staffList: Staff[];
  selectedStaffId: number;
  setSelectedStaffId: (id: number) => void;
  selectedMonth: { year: number; month: number; monthName: string };
  onSelectMonth: (year: number, month: number) => void;
  darkMode: boolean;
  setDarkMode: (val: boolean) => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
  activeShiftTitle: string;
  onLogout?: () => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline' | 'error';
  onForceSyncToCloud?: () => void;
  onShowSplash?: () => void;
  isRefreshing?: boolean;
  onRefreshServer?: () => void;
  medicalNotificationCount?: number;
  onOpenMedicalNotifications?: () => void;
  onOpenActiveShiftModal?: () => void;
  onRestoreSeptemberPdf?: () => void;
  onRestoreOctoberPdf?: () => void;
}


export const Navbar: React.FC<NavbarProps> = ({
  userRole = 'staff',
  currentTab,
  setCurrentTab,
  staffList,
  selectedStaffId,
  setSelectedStaffId,
  selectedMonth,
  onSelectMonth,
  darkMode,
  setDarkMode,
  soundEnabled,
  setSoundEnabled,
  activeShiftTitle,
  onLogout,
  cloudStatus = 'connected',
  onForceSyncToCloud,
  onShowSplash,
  isRefreshing = false,
  onRefreshServer,
  medicalNotificationCount = 0,
  onOpenMedicalNotifications,
  onOpenActiveShiftModal,
  onRestoreSeptemberPdf,
  onRestoreOctoberPdf,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');
  const [twoHourTheme, setTwoHourTheme] = useState<TwoHourTheme>(() => getCurrentTwoHourTheme());

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const mins = String(now.getMinutes()).padStart(2, '0');
      const secs = String(now.getSeconds()).padStart(2, '0');
      setTimeStr(`${hours}:${mins}:${secs} WIB`);

      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      setDateStr(now.toLocaleDateString('id-ID', options));
      setTwoHourTheme(getCurrentTwoHourTheme(now));
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleSound = () => {
    const newVal = !soundEnabled;
    setSoundEnabled(newVal);
    soundManager.setEnabled(newVal);
    if (newVal) {
      soundManager.playChime();
    }
  };

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
      {/* Top Banner / Institution Title */}
      <div className="bg-slate-100/95 dark:bg-slate-950 text-slate-700 dark:text-slate-300 px-3 py-1 text-[11px] font-medium border-b border-slate-200/80 dark:border-slate-800 flex flex-wrap items-center justify-between gap-1.5 transition-colors">
        {/* Left Side: Brand Badges & Medical Notifications (Proporsional 1 Baris) */}
        <div className="flex items-center gap-2 min-w-0 flex-nowrap shrink-0">
          <div className="flex items-center gap-1.5 shrink-0 flex-nowrap">
            {/* Badge Kemensos RI */}
            <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded bg-emerald-600 text-[10px] font-bold uppercase tracking-wider text-white shadow-2xs shrink-0 select-none border border-emerald-500/50">
              <ShieldCheck className="w-2.5 h-2.5 shrink-0" /> Kemensos RI
            </span>

            {/* Tulisan SRT 1 Kab Kediri - Nuansa Bendera Merah Putih Berkibar (Sejajar Kemensos RI) */}
            <div 
              className="animate-flag-wave inline-flex items-center gap-1.5 h-[22px] px-2 rounded bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-red-500/30 shadow-2xs select-none shrink-0 cursor-default"
              title="SRT 1 Kab Kediri - Nuansa Sang Saka Merah Putih Berkibar"
            >
              {/* SVG Bendera Merah Putih Berkibar */}
              <svg className="w-3.5 h-3.5 shrink-0 -ml-0.5" viewBox="0 0 24 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <line x1="2" y1="1" x2="2" y2="19" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round"/>
                <circle cx="2" cy="1.5" r="1.2" fill="#fbbf24"/>
                <path d="M 2 2.5 C 6.5 1.2, 10.5 4.2, 15 3 C 18 2.2, 20.5 2.8, 22 3.2 L 22 8.5 C 20.5 8.1, 18 7.5, 15 8.3 C 10.5 9.5, 6.5 6.5, 2 7.8 Z" fill="#EF4444"/>
                <path d="M 2 7.8 C 6.5 6.5, 10.5 9.5, 15 8.3 C 18 7.5, 20.5 8.1, 22 8.5 L 22 13.8 C 20.5 13.4, 18 12.8, 15 13.6 C 10.5 14.8, 6.5 11.8, 2 13.1 Z" fill="#FFFFFF" stroke="#e2e8f0" strokeWidth="0.3"/>
              </svg>
              <span className="text-flag-merah-putih font-black tracking-wider text-[11px] leading-none">
                SRT 1 Kab Kediri
              </span>
            </div>

            {/* Ikon Notifikasi Rencana Berobat / Kontrol Siswa (Sejajar & Proporsional 1 Baris dengan Kemensos RI & SRT 1) */}
            <button
              type="button"
              onClick={onOpenMedicalNotifications}
              className="inline-flex items-center gap-1.5 h-[22px] px-2 rounded bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-700 hover:to-amber-600 text-white font-bold text-[10px] shadow-2xs hover:shadow-xs active:scale-95 transition-all cursor-pointer border border-rose-400/40 select-none shrink-0"
              title="Klik untuk membuka Pengingat Rencana Kontrol & Rujukan Siswa (UKS, Puskesmas, Rumah Sakit)"
            >
              <Pill className="w-3 h-3 shrink-0 animate-pulse text-rose-100" />
              <span className="tracking-tight hidden xs:inline">Rencana Kontrol</span>
              <span className="tracking-tight xs:hidden">Kontrol</span>
              {medicalNotificationCount > 0 ? (
                <span className="inline-flex items-center justify-center min-w-[14px] h-[14px] px-1 rounded-full text-[8.5px] font-black bg-white text-rose-700 shadow-2xs leading-none">
                  {medicalNotificationCount}
                </span>
              ) : (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 shrink-0" title="Semua rencana terpantau" />
              )}
            </button>
          </div>

          {userRole === 'admin' && (
            <span className="hidden sm:inline-flex items-center gap-1 h-[22px] px-1.5 rounded bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 text-amber-800 dark:text-amber-300 text-[10px] font-bold uppercase tracking-wider shadow-2xs shrink-0">
              👑 Admin
            </span>
          )}

          <span className="hidden lg:inline text-slate-400 dark:text-slate-600">•</span>
          <span className="hidden lg:inline text-slate-600 dark:text-slate-400 text-[10.5px] truncate max-w-[240px]">{INSTITUTION_INFO.sekolah}</span>
        </div>
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 text-[11px]">
          {/* Cloud Database Status Badge */}
          <div 
            onClick={onForceSyncToCloud}
            title="Koneksi Supabase Cloud Online & Real-time (Klik untuk sinkronkan ulang)"
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-all shadow-2xs bg-emerald-50 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700/80 hover:bg-emerald-100"
          >
            <Database className={`w-2.5 h-2.5 ${cloudStatus === 'syncing' ? 'animate-spin text-emerald-600' : 'text-emerald-600 dark:text-emerald-400'}`} />
            <span className="hidden sm:inline">
              {cloudStatus === 'syncing' 
                ? 'Menyinkronkan...' 
                : 'Supabase Online'}
            </span>
            <span className={`w-1.5 h-1.5 rounded-full ${
              cloudStatus === 'syncing' ? 'bg-emerald-500 animate-ping' : 'bg-emerald-500 animate-pulse'
            }`} />
          </div>

          {/* Dedicated Refresh from Server Button in Top Bar */}
          {onRefreshServer && (
            <button
              type="button"
              onClick={onRefreshServer}
              disabled={isRefreshing}
              title={isRefreshing ? 'Sedang memuat data dari server...' : 'Ambil data terbaru dari server Supabase'}
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 active:scale-95 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:border-blue-400 transition-all cursor-pointer disabled:opacity-50 shadow-2xs"
            >
              <RefreshCw className={`w-2.5 h-2.5 text-blue-600 dark:text-blue-400 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">Refresh</span>
            </button>
          )}

          {/* Dedicated Reset to PDF Baseline Button when viewing September 2026 */}
          {selectedMonth.year === 2026 && selectedMonth.month === 9 && onRestoreSeptemberPdf && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kembalikan jadwal September 2026 ke jadwal resmi sesuai dokumen PDF (100% persis asli tanpa aturan mengikat)?')) {
                  onRestoreSeptemberPdf();
                }
              }}
              title="Kembalikan jadwal September 2026 100% persis dokumen PDF resmi dan lepaskan aturan mengikat"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-800 border border-teal-300 dark:bg-teal-950/80 dark:hover:bg-teal-900 dark:text-teal-200 dark:border-teal-700 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
              <span>Reset PDF Sept</span>
            </button>
          )}

          {/* Dedicated Reset to PDF Baseline Button when viewing October 2026 */}
          {selectedMonth.year === 2026 && selectedMonth.month === 10 && onRestoreOctoberPdf && (
            <button
              type="button"
              onClick={() => {
                if (window.confirm('Kembalikan jadwal Oktober 2026 ke jadwal resmi sesuai dokumen PDF (100% persis asli tanpa aturan mengikat)?')) {
                  onRestoreOctoberPdf();
                }
              }}
              title="Kembalikan jadwal Oktober 2026 100% persis dokumen PDF resmi dan lepaskan aturan mengikat"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-teal-50 hover:bg-teal-100 active:scale-95 text-teal-800 border border-teal-300 dark:bg-teal-950/80 dark:hover:bg-teal-900 dark:text-teal-200 dark:border-teal-700 transition-all cursor-pointer shadow-2xs"
            >
              <RotateCcw className="w-2.5 h-2.5 text-teal-600 dark:text-teal-400" />
              <span>Reset PDF Okt</span>
            </button>
          )}

          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" />
            <span className="font-mono text-slate-800 dark:text-amber-300 font-bold">{timeStr}</span>
          </div>
          <span className="text-slate-300 dark:text-slate-600 hidden sm:inline">|</span>
          <div className="hidden sm:flex items-center gap-1">
            <Calendar className="w-3 h-3 text-slate-500 dark:text-slate-400" />
            <span>{dateStr}</span>
          </div>

          {/* Tombol Shif Aktif (Munculkan Pop-up Petugas & Tugas Kunci di Jam Ini) */}
          {onOpenActiveShiftModal && (
            <button
              type="button"
              onClick={onOpenActiveShiftModal}
              title="Klik untuk melihat siapa yang bertugas di jam ini dan tugas prioritasnya"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-2xs active:scale-95 transition-all cursor-pointer"
            >
              <Sparkles className="w-2.5 h-2.5 text-amber-300" />
              <span>Petugas Jam Ini</span>
            </button>
          )}

          {/* Speaker Sound Toggle (Sejajar Kemensos RI) */}
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundEnabled ? 'Suara Notifikasi Aktif' : 'Suara Notifikasi Dinonaktifkan'}
            className={`p-1 rounded text-xs transition-colors cursor-pointer flex items-center shadow-2xs ${
              soundEnabled
                ? 'text-amber-700 dark:text-amber-400 hover:text-amber-800 bg-amber-50 dark:bg-slate-800/90 border border-amber-300 dark:border-amber-500/30'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          {/* Mode Gelap/Terang Toggle */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            title={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            aria-label={darkMode ? 'Beralih ke Mode Terang' : 'Beralih ke Mode Gelap'}
            className={`p-1 rounded text-xs transition-all cursor-pointer flex items-center shadow-2xs active:scale-95 ${
              darkMode
                ? 'bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/40'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {darkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-600" />}
          </button>

          {/* Ikon Keluar (Logout) Sejajar Kemensos RI */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Keluar / Kunci Sesi"
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 active:scale-95 text-rose-700 border border-rose-200 dark:bg-rose-950/90 dark:hover:bg-rose-900 dark:text-rose-300 dark:border-rose-700/80 transition-all cursor-pointer shadow-2xs"
            >
              <LogOut className="w-3 h-3 text-rose-600 dark:text-rose-400" />
              <span>Keluar</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-[1680px] mx-auto px-2 sm:px-4 py-1.5 flex flex-wrap items-center justify-between gap-2">
        {/* Logo & Title - Japanese Soft Aesthetic & Watermark Block */}
        <div 
          className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl bg-gradient-to-r ${twoHourTheme.gradientClass} border ${twoHourTheme.borderClass} shadow-xs transition-all duration-1000 cursor-pointer group select-none relative overflow-hidden`} 
          onClick={() => setCurrentTab('dashboard')}
          title={`Sistem Jadwal Shif Wali Asuh • Tema Jepang: ${twoHourTheme.name} (${twoHourTheme.japaneseName}) • ${twoHourTheme.timeSlot}`}
        >
          {/* Subtle Ambient Glow inside block */}
          <div className={`absolute inset-0 bg-gradient-to-r ${twoHourTheme.accentGlow} pointer-events-none transition-all duration-1000`} />

          {/* Subtle Japanese Traditional Watermark */}
          <JapaneseBannerWatermark type={twoHourTheme.watermarkType} kanji={twoHourTheme.japaneseKanji} />

          <img 
            src="/logo.svg" 
            alt="Logo Sekolah Rakyat" 
            className="w-8 h-8 rounded-lg shadow-xs object-contain bg-white/95 border border-white/30 p-0.5 shrink-0 group-hover:scale-105 transition-transform duration-300 relative z-10" 
          />
          <div className="relative z-10">
            <div className="flex items-center gap-1.5">
              <h1 className={`text-sm sm:text-base font-black ${twoHourTheme.titleColor} leading-tight tracking-tight drop-shadow-xs transition-colors duration-1000`}>
                Sistem Jadwal Shif Wali Asuh
              </h1>
              <span className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[9.5px] font-extrabold bg-white/15 text-white border border-white/20 backdrop-blur-xs shadow-2xs">
                <Sparkles className={`w-2.5 h-2.5 ${twoHourTheme.iconColor} animate-pulse`} />
                {activeShiftTitle}
              </span>
            </div>
            <div className="flex items-center gap-1.5 leading-none pt-0.5">
              <p className={`text-[10.5px] ${twoHourTheme.subtitleColor} font-medium transition-colors duration-1000`}>
                Otomatisasi Jadwal Harian & Notifikasi Pengingat Tugas
              </p>
              <span className="hidden sm:inline-flex items-center gap-1 px-1 rounded text-[8.5px] font-bold bg-white/10 text-white/80 border border-white/15">
                <Clock className="w-2 h-2 text-white/70" />
                {twoHourTheme.timeSlot}
              </span>
            </div>
          </div>
        </div>

        {/* User Identity & Quick Controls (Ringkas, Pas Layar HP Tanpa Geser) */}
        <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Month Selector Switcher */}
          <div className="flex-1 sm:flex-initial min-w-0 max-w-[52%] sm:max-w-none flex items-center gap-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/60 dark:to-indigo-950/60 px-2 py-1 rounded-lg border border-blue-200 dark:border-blue-800 text-[11px] shadow-2xs">
            <Calendar className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <select
              aria-label="Pilih Periode Bulan Jadwal"
              value={`${selectedMonth.year}-${selectedMonth.month}`}
              onChange={(e) => {
                const [y, m] = e.target.value.split('-').map(Number);
                onSelectMonth(y, m);
              }}
              className="bg-transparent font-bold text-blue-900 dark:text-blue-200 focus:outline-none cursor-pointer pr-1 text-[11px] w-full truncate"
            >
              <option value="2026-8" className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                Agustus 2026
              </option>
              <option value="2026-9" className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                September 2026
              </option>
              <option value="2026-10" className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                Oktober 2026 (Aktif)
              </option>
              <option value="2026-11" className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                November 2026
              </option>
              <option value="2026-12" className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                Desember 2026
              </option>
              {/* Fallback for any other custom selected month */}
              {![8, 9, 10, 11, 12].includes(selectedMonth.month) && (
                <option value={`${selectedMonth.year}-${selectedMonth.month}`} className="dark:bg-slate-800 dark:text-slate-100 font-bold">
                  {selectedMonth.monthName} {selectedMonth.year}
                </option>
              )}
            </select>
          </div>

          {/* Active Staff Profile Selector */}
          <div className="flex-1 sm:flex-initial min-w-0 max-w-[48%] sm:max-w-none flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px]">
            <User className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 font-medium hidden sm:inline">Saya:</span>
            <select
              aria-label="Pilih Profil Wali Asuh"
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(Number(e.target.value))}
              className="bg-transparent font-semibold text-slate-800 dark:text-slate-100 focus:outline-none cursor-pointer pr-0.5 text-[11px] w-full truncate"
            >
              {staffList.map((st) => (
                <option key={st.id} value={st.id} className="dark:bg-slate-800 dark:text-slate-100">
                  {st.code ? `[${st.code}] ` : ''}{st.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-[1680px] mx-auto px-2 sm:px-4">
        <nav className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none border-t border-slate-100 dark:border-slate-800">
          {userRole === 'admin' ? (
            /* ADMIN PORTAL TABS */
            <>
              <button
                onClick={() => setCurrentTab('admin')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  currentTab === 'admin'
                    ? 'bg-amber-600 text-white shadow-xs font-extrabold'
                    : 'text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-400/40'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5 text-amber-500 dark:text-amber-300" />
                <span>Panel Tukar Shif (Admin)</span>
              </button>

              <button
                onClick={() => setCurrentTab('leave')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                  currentTab === 'leave'
                    ? 'bg-rose-600 text-white shadow-xs font-extrabold'
                    : 'text-rose-800 dark:text-rose-300 bg-rose-50/80 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-300 dark:border-rose-800'
                }`}
                title="Menu Manajemen Perizinan Petugas (Sakit, Dinas Luar, Bukti Surat)"
              >
                <FileText className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span>Menu Perizinan (IZIN)</span>
              </button>

              <button
                onClick={() => setCurrentTab('staff-management')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  currentTab === 'staff-management'
                    ? 'bg-indigo-600 text-white shadow-xs font-extrabold'
                    : 'text-indigo-800 dark:text-indigo-300 bg-indigo-50/80 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-300 dark:border-indigo-800'
                }`}
                title="Kelola data wali asuh, tambah petugas baru, ganti nama, dan arsip"
              >
                <Users className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Kelola Wali Asuh</span>
              </button>

              <button
                onClick={() => setCurrentTab('matrix')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'matrix'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Matriks Roster 31 Hari</span>
              </button>

              <button
                onClick={() => setCurrentTab('codeguide')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'codeguide'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-sky-800 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800'
                }`}
                title="Buka Kamus, Petunjuk & Keterangan Lengkap Semua Kode Penugasan"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
                <span>Petunjuk Kode</span>
              </button>

              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Hari Ini</span>
              </button>

              <button
                onClick={() => setCurrentTab('assignment')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'assignment'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-teal-800 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800'
                }`}
                title="Buka Pengingat Penugasan Pos Sore & Malam (Siap Kirim WhatsApp)"
              >
                <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
                <span>Pengingat Penugasan</span>
              </button>

              <button
                onClick={() => setCurrentTab('handover')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'handover'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Laporan Serah Terima Shift</span>
              </button>

              <button
                onClick={() => setCurrentTab('sop')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'sop'
                    ? 'bg-indigo-600 text-white shadow-xs font-bold'
                    : 'text-indigo-800 dark:text-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800'
                }`}
              >
                <ListTodo className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-300" />
                <span>SOP & Checklist Shif (Admin)</span>
              </button>

              <button
                onClick={() => setCurrentTab('medical')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'medical'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <Pill className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300" />
                <span>Rencana Berobat (UKS/RS)</span>
                {medicalNotificationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-rose-500 text-white animate-pulse">
                    {medicalNotificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentTab('portfolio')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'portfolio'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                }`}
                title="Portofolio & Rekam Siswa Asuh (345 Siswa)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Portofolio Siswa</span>
              </button>

              <button
                onClick={() => setCurrentTab('auto')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'auto'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>Atur Shif Otomatis</span>
              </button>

              <button
                onClick={() => setCurrentTab('notifications')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'notifications'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notifikasi & Pengingat</span>
              </button>

              <button
                onClick={() => setCurrentTab('print')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'print'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jadwal Resmi</span>
              </button>

            </>
          ) : (
            /* REGULAR WALI ASUH (STAFF) TABS - TUKAR SHIF DISEMBUNYIKAN */
            <>
              <button
                onClick={() => setCurrentTab('dashboard')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'dashboard'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard Hari Ini</span>
              </button>

              <button
                onClick={() => setCurrentTab('matrix')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'matrix'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span>Matriks Roster 31 Hari</span>
              </button>

              <button
                onClick={() => setCurrentTab('codeguide')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'codeguide'
                    ? 'bg-sky-600 text-white shadow-xs font-bold'
                    : 'text-sky-800 dark:text-sky-300 bg-sky-50/70 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800'
                }`}
                title="Buka Kamus, Petunjuk & Keterangan Lengkap Semua Kode Penugasan"
              >
                <BookOpen className="w-3.5 h-3.5 text-sky-600 dark:text-sky-300" />
                <span>Petunjuk Kode</span>
              </button>

              <button
                onClick={() => setCurrentTab('personal')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'personal'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <User className="w-3.5 h-3.5" />
                <span>Jadwal Personal ({selectedStaff?.name.split(' ')[0]})</span>
              </button>

              <button
                onClick={() => setCurrentTab('assignment')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'assignment'
                    ? 'bg-teal-700 text-white shadow-xs font-bold'
                    : 'text-teal-800 dark:text-teal-300 bg-teal-50/70 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50 border border-teal-200 dark:border-teal-800'
                }`}
                title="Buka Pengingat Penugasan Pos Sore & Malam (Siap Kirim WhatsApp)"
              >
                <Send className="w-3.5 h-3.5 text-teal-600 dark:text-teal-300" />
                <span>Pengingat Penugasan</span>
              </button>

              <button
                onClick={() => setCurrentTab('handover')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'handover'
                    ? 'bg-emerald-600 text-white shadow-xs font-bold'
                    : 'text-emerald-700 dark:text-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Laporan Serah Terima Shift</span>
              </button>

              <button
                onClick={() => setCurrentTab('medical')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'medical'
                    ? 'bg-rose-600 text-white shadow-xs font-bold'
                    : 'text-rose-700 dark:text-rose-300 bg-rose-50/70 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800'
                }`}
              >
                <Pill className="w-3.5 h-3.5 text-rose-500 dark:text-rose-300" />
                <span>Rencana Berobat (UKS/RS)</span>
                {medicalNotificationCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[9.5px] font-black bg-rose-500 text-white animate-pulse">
                    {medicalNotificationCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => setCurrentTab('portfolio')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'portfolio'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-blue-800 dark:text-blue-300 bg-blue-50/70 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50 border border-blue-200 dark:border-blue-800'
                }`}
                title="Portofolio & Rekam Siswa Asuh (345 Siswa)"
              >
                <GraduationCap className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>Portofolio Siswa</span>
              </button>

              <button
                onClick={() => setCurrentTab('notifications')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'notifications'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>Notifikasi & Pengingat</span>
              </button>

              <button
                onClick={() => setCurrentTab('print')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
                  currentTab === 'print'
                    ? 'bg-blue-600 text-white shadow-xs font-bold'
                    : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Jadwal Resmi</span>
              </button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
};
