import React, { useState, useMemo } from 'react';
import { 
  X, 
  Calendar, 
  Download, 
  Clock, 
  Bell, 
  CheckCircle2, 
  ExternalLink, 
  HelpCircle, 
  ChevronDown, 
  ChevronUp, 
  ListTodo, 
  Briefcase,
  Smartphone,
  Laptop
} from 'lucide-react';
import { DailyTask, MonthSchedule, Staff } from '../types';
import { SHIFT_DEFINITIONS, SHIFT_TASKS_TEMPLATE } from '../data/initialSchedule';
import { generateIcsCalendar, downloadIcsFile, getTasksForShift, IcsExportOptions } from '../utils/icsExport';
import { INDONESIAN_DAY_NAMES, INDONESIAN_MONTH_NAMES } from '../utils/scheduler';
import { soundManager } from '../utils/audio';

export interface IcsExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  schedule: MonthSchedule;
  activeDay: number;
  sopTasks?: DailyTask[];
}

export const IcsExportModal: React.FC<IcsExportModalProps> = ({
  isOpen,
  onClose,
  staff,
  schedule,
  activeDay,
  sopTasks = SHIFT_TASKS_TEMPLATE,
}) => {
  const [scope, setScope] = useState<'active_day' | 'full_month' | 'upcoming_7_days'>('active_day');
  const [includeTasks, setIncludeTasks] = useState(true);
  const [includeShift, setIncludeShift] = useState(true);
  const [alarmOffset, setAlarmOffset] = useState<number>(15);
  const [showHelp, setShowHelp] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Safe active day
  const safeDay = Math.min(Math.max(1, activeDay), schedule.totalDays || 30);
  const currentShift = schedule.days[safeDay]?.[staff.id] || 'O';
  const shiftMeta = SHIFT_DEFINITIONS[currentShift] || SHIFT_DEFINITIONS['O'];

  const dateObj = useMemo(() => {
    return new Date(schedule.year, schedule.month - 1, safeDay);
  }, [schedule.year, schedule.month, safeDay]);
  const dayName = INDONESIAN_DAY_NAMES[dateObj.getDay()];
  const monthName = schedule.monthName || INDONESIAN_MONTH_NAMES[schedule.month - 1] || 'September';

  // Calculate event count preview
  const previewCounts = useMemo(() => {
    let daysToCheck: number[] = [];
    if (scope === 'active_day') {
      daysToCheck = [safeDay];
    } else if (scope === 'upcoming_7_days') {
      for (let i = 0; i < 7; i++) {
        const d = safeDay + i;
        if (d <= schedule.totalDays) daysToCheck.push(d);
      }
    } else {
      daysToCheck = Array.from({ length: schedule.totalDays }, (_, i) => i + 1);
    }

    let totalTasksCount = 0;
    let totalShiftsCount = 0;

    daysToCheck.forEach((d) => {
      const sh = schedule.days[d]?.[staff.id] || 'O';
      const isOff = ['OFF', 'O', 'L', 'CUTI', 'LP'].includes(sh);
      if (!isOff) {
        if (includeShift) totalShiftsCount += 1;
        if (includeTasks) {
          const tList = getTasksForShift(sh, sopTasks);
          totalTasksCount += tList.length;
        }
      }
    });

    return { totalTasksCount, totalShiftsCount, daysCount: daysToCheck.length };
  }, [scope, safeDay, schedule, staff.id, includeTasks, includeShift, sopTasks]);

  if (!isOpen) return null;

  const handleDownload = () => {
    const options: IcsExportOptions = {
      includeShiftEvents: includeShift,
      includeDailyTasks: includeTasks,
      alarmOffsetMinutes: alarmOffset,
      scope: scope,
      targetDay: safeDay,
    };

    const icsContent = generateIcsCalendar(staff, schedule, sopTasks, options);
    
    // Clean safe filename
    const cleanStaffName = staff.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
    const scopeLabel = scope === 'active_day' 
      ? `Tgl_${safeDay}_${monthName}` 
      : scope === 'full_month' 
      ? `Sebulan_${monthName}_${schedule.year}` 
      : `7Hari_Mulai_${safeDay}_${monthName}`;
    const filename = `Pengingat_Tugas_${cleanStaffName}_${scopeLabel}.ics`;

    downloadIcsFile(filename, icsContent);
    soundManager.playChime();
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        role="dialog"
        aria-modal="true"
        className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col"
      >
        {/* Modal Header */}
        <div className="px-4 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/80 rounded-t-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                Sinkronkan Pengingat Kalender (.ICS)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Ekspor alarm tugas harian ke Google Calendar, Apple & Outlook
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 text-xs">
          {/* Target Profile Card */}
          <div className="p-2.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/60 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                {staff.name.charAt(0)}
              </div>
              <div className="truncate">
                <div className="font-bold text-slate-900 dark:text-white text-xs truncate">
                  {staff.name}
                </div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400">
                  {staff.group || 'Wali Asuh'} • Tgl {safeDay} ({dayName}): <span className="font-bold text-blue-600 dark:text-blue-400">{shiftMeta.name}</span>
                </div>
              </div>
            </div>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-black shrink-0 ${shiftMeta.badgeClass}`}>
              {currentShift}
            </span>
          </div>

          {/* Scope Selector */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              1. Pilih Rentang Waktu Jadwal:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={() => setScope('active_day')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'active_day'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>Hari Terpilih</span>
                  {scope === 'active_day' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Tgl {safeDay} {monthName}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('full_month')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'full_month'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>1 Bulan Penuh</span>
                  {scope === 'full_month' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                  {monthName} {schedule.year}
                </div>
              </button>

              <button
                type="button"
                onClick={() => setScope('upcoming_7_days')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  scope === 'upcoming_7_days'
                    ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 ring-1 ring-blue-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-slate-900 dark:text-white flex items-center justify-between">
                  <span>7 Hari Kedepan</span>
                  {scope === 'upcoming_7_days' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Mulai Tgl {safeDay}
                </div>
              </button>
            </div>
          </div>

          {/* Options Checklist */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 block">
              2. Komponen Pengingat:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTasks}
                  onChange={(e) => setIncludeTasks(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <ListTodo className="w-3.5 h-3.5 text-blue-600" />
                    <span>Checklist Tugas SOP</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Pengingat jam presensi, sholat berjamaah, makan, kerapihan, & serah terima.
                  </div>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeShift}
                  onChange={(e) => setIncludeShift(e.target.checked)}
                  className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Jadwal Shif Utama</span>
                  </div>
                  <div className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                    Blok jam kerja dinas shif (alarm 1 jam sebelum shif dimulai).
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Alarm Reminder Offset */}
          <div className="space-y-1.5">
            <label htmlFor="alarm-offset-select" className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
              <Bell className="w-3.5 h-3.5 text-amber-500" />
              <span>3. Waktu Peringatan Alarm Tugas Harian:</span>
            </label>
            <select
              id="alarm-offset-select"
              value={alarmOffset}
              onChange={(e) => setAlarmOffset(Number(e.target.value))}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
            >
              <option value={15}>🔔 15 Menit Sebelum Waktu Tugas (Disarankan)</option>
              <option value={30}>🔔 30 Menit Sebelum Waktu Tugas</option>
              <option value={10}>🔔 10 Menit Sebelum Waktu Tugas</option>
              <option value={5}>🔔 5 Menit Sebelum Waktu Tugas</option>
              <option value={0}>⏰ Tepat Pada Jam Tugas Dimulai (0 Menit)</option>
            </select>
          </div>

          {/* Summary Preview Box */}
          <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 flex items-center justify-between text-[11px]">
            <span className="text-slate-600 dark:text-slate-300">
              Total Acara Kalender yang Akan Diekspor:
            </span>
            <span className="font-bold text-blue-600 dark:text-blue-400">
              {previewCounts.totalTasksCount + previewCounts.totalShiftsCount} Event 
              <span className="text-slate-400 font-normal"> ({previewCounts.totalTasksCount} tugas + {previewCounts.totalShiftsCount} shif)</span>
            </span>
          </div>

          {/* How to import toggle */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-2">
            <button
              type="button"
              onClick={() => setShowHelp(!showHelp)}
              className="flex items-center justify-between w-full text-slate-600 dark:text-slate-400 hover:text-blue-600 text-xs font-semibold py-1"
            >
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5 text-blue-500" />
                <span>Petunjuk Cara Impor ke Google Calendar & Outlook</span>
              </span>
              {showHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showHelp && (
              <div className="mt-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2 text-[11px] leading-relaxed animate-in fade-in duration-200">
                <div className="flex items-start gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Di Ponsel (Android / iPhone):</strong>
                    <p className="text-slate-600 dark:text-slate-400">
                      Setelah mengunduh file .ics, ketuk file dari notifikasi unduhan atau pengelola file, lalu pilih <em>"Buka dengan Kalender"</em> atau <em>"Tambahkan Semua ke Kalender"</em>. Alarm akan langsung aktif di ponsel Anda.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <Laptop className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Di Laptop (Google Calendar Web):</strong>
                    <p className="text-slate-600 dark:text-slate-400">
                      Buka <strong>calendar.google.com</strong> &rarr; Klik ikon <strong>Setelan (Gerigi)</strong> &rarr; Pilih <strong>Impor & Ekspor</strong> &rarr; Unggah file .ics ini &rarr; Klik <strong>Impor</strong>.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 pt-1.5 border-t border-slate-200 dark:border-slate-800">
                  <Laptop className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900 dark:text-white">Di Microsoft Outlook:</strong>
                    <p className="text-slate-600 dark:text-slate-400">
                      Klik ganda (double-click) file .ics yang telah diunduh, lalu pilih <strong>"Impor ke Kalender Pribadi"</strong>.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 rounded-b-2xl flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors text-xs cursor-pointer"
          >
            Tutup
          </button>

          <button
            type="button"
            onClick={handleDownload}
            disabled={!includeTasks && !includeShift}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <span>File .ICS Berhasil Diunduh!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Unduh File .ICS Sekarang</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
