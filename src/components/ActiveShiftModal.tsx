import React, { useState, useEffect, useMemo } from 'react';
import { 
  Sun, 
  Sunset, 
  Moon, 
  Clock, 
  Users, 
  X, 
  Sparkles
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode, MorningPostAssignment, P5TaskAssignment } from '../types';
import { soundManager } from '../utils/audio';
import { getLocalP5Assignments, subscribeToP5Assignments } from '../utils/p5TaskService';
import { getLocalMorningPostAssignments, subscribeToMorningPostAssignments } from '../utils/morningPostService';

interface ActiveShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: MonthSchedule;
  staffList: Staff[];
  selectedStaffId: number;
  onNavigateToTab?: (tab: string) => void;
}

export type ShiftPeriodType = 'pagi' | 'sore' | 'malam';

export interface ShiftPeriodInfo {
  type: ShiftPeriodType;
  title: string;
  japaneseTitle: string;
  timeRange: string;
  accentGradient: string;
  icon: React.ReactNode;
}

/**
 * Deteksi periode shif berdasarkan jam lokal sekarang
 * Pagi: 07:00 - 15:00 (P4 s.d 20:00)
 * Sore: 15:00 - 23:00
 * Malam: 23:00 - 07:00
 */
export function getCurrentShiftPeriod(date: Date = new Date()): ShiftPeriodInfo {
  const hours = date.getHours();

  if (hours >= 7 && hours < 15) {
    return {
      type: 'pagi',
      title: 'Shif Pagi',
      japaneseTitle: '朝の当番',
      timeRange: '07:00 – 15:00 WIB',
      accentGradient: 'from-emerald-700 via-teal-700 to-emerald-800',
      icon: <Sun className="w-3.5 h-3.5 text-amber-300" />,
    };
  }

  if (hours >= 15 && hours < 23) {
    return {
      type: 'sore',
      title: 'Shif Sore',
      japaneseTitle: '夕方の当番',
      timeRange: '15:00 – 23:00 WIB',
      accentGradient: 'from-emerald-800 via-teal-800 to-amber-900',
      icon: <Sunset className="w-3.5 h-3.5 text-amber-300" />,
    };
  }

  // Malam: 23:00 s.d 07:00
  return {
    type: 'malam',
    title: 'Shif Malam',
    japaneseTitle: '夜の当番',
    timeRange: '23:00 – 07:00 WIB',
    accentGradient: 'from-slate-900 via-teal-950 to-indigo-950',
    icon: <Moon className="w-3.5 h-3.5 text-indigo-300" />,
  };
}

/**
 * Keterangan singkat & padat untuk setiap kode shif (misal: S2A Jaga Kantin SMP)
 */
export function getShortShiftDescription(
  code: ShiftCode, 
  customP5Title?: string,
  morningPostTitle?: string
): { shortDesc: string; badgeBg: string } {
  switch (code) {
    case 'P1':
    case 'P':
      return { 
        shortDesc: morningPostTitle ? `Pos ${morningPostTitle} (07-15)` : 'Piket Pagi 1 (Apel & Makan Siang)', 
        badgeBg: 'bg-sky-600 text-white' 
      };
    case 'P2':
      return { 
        shortDesc: morningPostTitle ? `Pos ${morningPostTitle} (08-16)` : 'Piket Pagi 2 (Operasional Sekolah)', 
        badgeBg: 'bg-teal-600 text-white' 
      };
    case 'P3':
      return { 
        shortDesc: morningPostTitle ? `Pos ${morningPostTitle} (07-16)` : 'Piket Pagi Khusus (Upacara / Senin 07-16)', 
        badgeBg: 'bg-amber-600 text-white' 
      };
    case 'P4':
      return { shortDesc: 'Pagi Acara & Patroli Luar (s.d 20:00)', badgeBg: 'bg-cyan-700 text-white' };
    case 'P5':
      return { 
        shortDesc: customP5Title ? `${customP5Title} (07-15)` : 'Pendamping Keterampilan/Vokasi (07-15)', 
        badgeBg: 'bg-emerald-700 text-white' 
      };
    case 'S2A':
      return { shortDesc: 'Jaga Kantin SMP & Maghrib', badgeBg: 'bg-purple-600 text-white' };
    case 'S3A':
      return { shortDesc: 'Jaga Kantin SMA & Belajar', badgeBg: 'bg-orange-500 text-white' };
    case 'S4A':
      return { shortDesc: 'Jaga Masjid & Pengkondisian', badgeBg: 'bg-emerald-600 text-white' };
    case 'S':
      return { shortDesc: 'Piket Sore Asrama', badgeBg: 'bg-orange-600 text-white' };
    case 'M1':
      return { shortDesc: 'Jaga Malam Sesi 1 & Subuh', badgeBg: 'bg-indigo-700 text-white' };
    case 'M2':
      return { shortDesc: 'Jaga Malam Sesi 2 & Qiyamul Lail', badgeBg: 'bg-blue-700 text-white' };
    case 'M3':
      return { shortDesc: 'Patroli Foto Barak 23:00 & Malam Penuh', badgeBg: 'bg-fuchsia-700 text-white' };
    case 'M':
      return { shortDesc: 'Jaga Malam Asrama', badgeBg: 'bg-slate-700 text-white' };
    default:
      return { shortDesc: 'Petugas Piket', badgeBg: 'bg-blue-600 text-white' };
  }
}

const STORAGE_KEY_LAST_POPUP = 'wali_asuh_last_active_shift_popup';
const TWO_HOURS_MS = 2 * 60 * 60 * 1000; // 2 jam = 7.200.000 ms

export function shouldShowTwoHourShiftPopup(): boolean {
  try {
    const lastTimestamp = localStorage.getItem(STORAGE_KEY_LAST_POPUP);
    if (!lastTimestamp) return true;

    const lastTime = parseInt(lastTimestamp, 10);
    if (isNaN(lastTime)) return true;

    const now = Date.now();
    return (now - lastTime) >= TWO_HOURS_MS;
  } catch {
    return true;
  }
}

export function recordTwoHourShiftPopupShown(): void {
  try {
    localStorage.setItem(STORAGE_KEY_LAST_POPUP, String(Date.now()));
  } catch {}
}

export const ActiveShiftModal: React.FC<ActiveShiftModalProps> = ({
  isOpen,
  onClose,
  schedule,
  staffList,
  selectedStaffId,
  onNavigateToTab,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [p5Assignments, setP5Assignments] = useState<Record<string, P5TaskAssignment>>(() =>
    getLocalP5Assignments(schedule.year, schedule.month)
  );
  const [morningPostAssignments, setMorningPostAssignments] = useState<Record<string, MorningPostAssignment>>(() =>
    getLocalMorningPostAssignments(schedule.year, schedule.month)
  );

  useEffect(() => {
    if (isOpen) {
      setCurrentDate(new Date());
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubMorning = subscribeToMorningPostAssignments(schedule.year, schedule.month, (data) => {
      setMorningPostAssignments(data);
    });
    const unsubP5 = subscribeToP5Assignments(schedule.year, schedule.month, (data) => {
      setP5Assignments(data);
    });
    return () => {
      unsubMorning();
      unsubP5();
    };
  }, [schedule.year, schedule.month]);

  const activePeriod = useMemo(() => {
    return getCurrentShiftPeriod(currentDate);
  }, [currentDate]);

  const todayDay = currentDate.getDate();
  const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][currentDate.getDay()];
  const timeFormatted = `${String(currentDate.getHours()).padStart(2, '0')}:${String(currentDate.getMinutes()).padStart(2, '0')}`;

  // Filter daftar petugas aktif di jam/periode sekarang
  const onDutyStaff = useMemo(() => {
    const list: {
      staff: Staff;
      shiftCode: ShiftCode;
      isCurrentUser: boolean;
      shortDesc: string;
      badgeBg: string;
    }[] = [];

    staffList.forEach((staff) => {
      const shiftCode = schedule.days[todayDay]?.[staff.id];
      if (!shiftCode || shiftCode === 'O' || shiftCode === 'LP' || shiftCode === 'L' || shiftCode === 'C') {
        return;
      }

      let isIncluded = false;
      if (activePeriod.type === 'pagi') {
        if (['P1', 'P2', 'P3', 'P4', 'P5', 'P'].includes(shiftCode)) {
          isIncluded = true;
        }
      } else if (activePeriod.type === 'sore') {
        if (['S2A', 'S3A', 'S4A', 'S', 'P4'].includes(shiftCode)) {
          isIncluded = true;
        }
      } else if (activePeriod.type === 'malam') {
        if (['M1', 'M2', 'M3', 'M'].includes(shiftCode)) {
          isIncluded = true;
        }
      }

      if (isIncluded) {
        const p5Custom = shiftCode === 'P5' ? p5Assignments[`${todayDay}_${staff.id}`]?.taskTitle : undefined;
        const staffAssign = morningPostAssignments[`${todayDay}_${staff.id}`];
        const morningPost = (shiftCode === 'P1' || shiftCode === 'P2' || shiftCode === 'P3' || shiftCode === 'P') 
          ? staffAssign?.postTitle 
          : undefined;
        const quran = staffAssign?.quranAssistance;
        const medicalGuard = staffAssign?.medicalGuardLabel;
        let { shortDesc, badgeBg } = getShortShiftDescription(shiftCode, p5Custom, morningPost);
        if (medicalGuard) {
          shortDesc = `${shortDesc} • 🏥 ${medicalGuard}`;
        }
        if (quran) {
          shortDesc = `${shortDesc} • 📖 ${quran}`;
        }
        list.push({
          staff,
          shiftCode,
          isCurrentUser: staff.id === selectedStaffId,
          shortDesc,
          badgeBg,
        });
      }
    });

    return list.sort((a, b) => {
      if (a.isCurrentUser) return -1;
      if (b.isCurrentUser) return 1;
      return a.staff.name.localeCompare(b.staff.name);
    });
  }, [staffList, schedule.days, schedule.year, schedule.month, todayDay, activePeriod.type, selectedStaffId, morningPostAssignments, p5Assignments]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 bg-slate-950/75 backdrop-blur-xs animate-fade-in select-none cursor-pointer"
      onClick={onClose}
    >
      {/* Bamboo Slat Notice Board Container */}
      <div
        className="relative bg-[#fbfcf9] dark:bg-slate-900 rounded-3xl max-w-[360px] sm:max-w-[400px] w-full border-4 border-[#52795d] dark:border-[#38523f] shadow-2xl overflow-hidden flex flex-col transition-all cursor-default ring-2 ring-emerald-400/30"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* ========================================================================= */}
        {/* BAMBOO GROVE ARTISTIC BORDER & HEADER (竹垣 - Takegaki & 掲示板)           */}
        {/* ========================================================================= */}
        <div className={`px-3 py-2 bg-gradient-to-r ${activePeriod.accentGradient} text-white relative shadow-sm border-b-2 border-emerald-900/40`}>
          {/* Subtle Bamboo watermark overlay in header */}
          <div className="absolute right-0 top-0 bottom-0 w-24 pointer-events-none opacity-20 flex items-center justify-end pr-2 overflow-hidden">
            <span className="font-serif font-black text-4xl text-white">竹</span>
          </div>

          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/25 hover:bg-black/50 text-white/90 hover:text-white transition-colors cursor-pointer border border-white/20 z-10"
            title="Tutup (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>

          <div className="flex items-center gap-2 pr-7 relative z-10">
            {/* Bamboo Leaf Badge Icon */}
            <div className="w-7 h-7 rounded-xl bg-black/25 backdrop-blur-sm border border-emerald-300/40 flex items-center justify-center shrink-0 shadow-inner">
              <span className="text-base">🎋</span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-950/70 text-emerald-200 px-2 py-0.5 rounded-full border border-emerald-400/30">
                  当番一覧 • {activePeriod.japaneseTitle}
                </span>
                <span className="px-1.5 py-0.2 rounded bg-black/30 text-[8.5px] font-bold text-amber-200 border border-white/10">
                  {activePeriod.timeRange}
                </span>
              </div>
              <h2 className="text-xs sm:text-sm font-black tracking-tight text-white mt-1 truncate">
                Petugas {activePeriod.title}
              </h2>
              <p className="text-[9.5px] text-emerald-100/90 truncate font-mono mt-0.5">
                {dayName}, {todayDay} {schedule.monthName} • {timeFormatted} WIB
              </p>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* BAMBOO SLAT NOTICE BOARD BODY (Bilah-bilah Bambu Bertingkat)                */}
        {/* ========================================================================= */}
        <div className="p-2 sm:p-2.5 space-y-1.5 bg-gradient-to-b from-[#f8faf6] to-[#edf4ea] dark:from-slate-900 dark:to-[#131c15]">
          {/* Subheader Title */}
          <div className="flex items-center justify-between px-1 pb-1 border-b border-emerald-200/80 dark:border-emerald-900/60">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-1">
              <Users className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
              <span>Petugas Aktif ({onDutyStaff.length} Orang)</span>
            </span>
            <span className="inline-flex items-center gap-1 text-[9px] text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-100/80 dark:bg-emerald-950/60 px-1.5 py-0.2 rounded-full border border-emerald-300/50">
              <Sparkles className="w-2.5 h-2.5 text-amber-500" />
              <span>Tiap 2 Jam</span>
            </span>
          </div>

          {/* List of Active Staff - Styled as Woven Bamboo Slats with Max Height Scroll */}
          {onDutyStaff.length > 0 ? (
            <div className="space-y-1 max-h-[60vh] overflow-y-auto pr-0.5 scrollbar-thin">
              {onDutyStaff.map(({ staff, shiftCode, isCurrentUser, shortDesc, badgeBg }) => (
                <div
                  key={staff.id}
                  className={`px-2.5 py-1.5 rounded-xl border flex items-center justify-between gap-1.5 transition-all ${
                    isCurrentUser
                      ? 'bg-emerald-50 dark:bg-emerald-950/70 border-emerald-400 dark:border-emerald-600 shadow-xs ring-1 ring-emerald-500/30'
                      : 'bg-white/90 dark:bg-slate-800/80 border-[#c5dcbe] dark:border-emerald-900/80 shadow-2xs hover:border-emerald-400'
                  }`}
                >
                  {/* Nama Petugas & Keterangan Tugas */}
                  <div className="min-w-0 flex-1 leading-tight">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-xs">🎍</span>
                      <span className="font-bold text-[11px] sm:text-xs text-slate-900 dark:text-white truncate">
                        {staff.name}
                      </span>
                      {isCurrentUser && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[8px] font-black bg-emerald-700 text-white shrink-0 shadow-2xs">
                          <span>🎋 SAYA</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[9.5px] text-emerald-800 dark:text-emerald-300 font-medium truncate mt-0.5 pl-4">
                      {shortDesc}
                    </p>
                  </div>

                  {/* Kode Tugas */}
                  <span className={`px-2 py-0.5 rounded-lg text-[9.5px] font-black shrink-0 ${badgeBg} shadow-2xs`}>
                    {shiftCode}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-3 px-2 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800 text-center text-[10px] text-emerald-700/80 dark:text-emerald-400 italic bg-white/50 dark:bg-slate-800/50">
              🎋 Tidak ada petugas yang dinas di jam ini.
            </div>
          )}
        </div>

        {/* ========================================================================= */}
        {/* FOOTER BAMBOO SLAT BOARD (Tombol & Keterangan)                             */}
        {/* ========================================================================= */}
        <div className="px-3 py-2 bg-[#edf4ea] dark:bg-slate-950 border-t-2 border-emerald-200/90 dark:border-emerald-900 flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1 text-[9px] text-emerald-800 dark:text-emerald-400 font-semibold">
            <Clock className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Rotasi 2 jam • 🍃 静寂</span>
          </div>

          <div className="flex items-center gap-1.5">
            {onNavigateToTab && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigateToTab('dashboard');
                }}
                className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-white dark:bg-slate-800 hover:bg-emerald-100 dark:hover:bg-slate-700 text-emerald-900 dark:text-slate-200 transition-colors cursor-pointer border border-emerald-300 dark:border-slate-700 shadow-2xs"
              >
                Dasbor
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                soundManager.playChime();
                onClose();
              }}
              className="px-3 py-1 rounded-xl text-[10px] font-black bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 hover:from-emerald-600 hover:to-teal-600 active:scale-95 text-white transition-all shadow-md shadow-emerald-950/20 cursor-pointer border border-emerald-500/30"
            >
              Tutup 🎋
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
