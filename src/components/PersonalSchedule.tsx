import React, { useState, useEffect } from 'react';
import { 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  Share2, 
  Bell, 
  BellRing, 
  Check, 
  Copy, 
  Sparkles, 
  CheckCircle2, 
  Briefcase, 
  Coffee,
  AlertTriangle
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode, DailyTask } from '../types';
import { SHIFT_DEFINITIONS, SHIFT_TASKS_TEMPLATE } from '../data/initialSchedule';
import { calculateStaffSummary, INDONESIAN_DAY_NAMES } from '../utils/scheduler';
import { soundManager } from '../utils/audio';
import { notificationService } from '../utils/notification';
import { getLocalMorningPostAssignments, subscribeToMorningPostAssignments } from '../utils/morningPostService';
import { getLocalP5Assignments, subscribeToP5Assignments } from '../utils/p5TaskService';
import { IcsExportModal } from './IcsExportModal';

interface PersonalScheduleProps {
  schedule: MonthSchedule;
  staffList: Staff[];
  selectedStaffId: number;
  setSelectedStaffId: (id: number) => void;
  activeDay: number;
  setActiveDay: (day: number) => void;
  onNavigateToTab: (tab: 'dashboard' | 'matrix' | 'notifications') => void;
  sopTasks?: DailyTask[];
}

export const PersonalSchedule: React.FC<PersonalScheduleProps> = ({
  schedule,
  staffList,
  selectedStaffId,
  setSelectedStaffId,
  activeDay,
  setActiveDay,
  onNavigateToTab,
  sopTasks,
}) => {
  const [copied, setCopied] = useState(false);
  const [isIcsModalOpen, setIsIcsModalOpen] = useState(false);

  const selectedStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0] || {
    id: 0,
    name: 'Belum Ada Petugas',
    role: 'Wali Asuh',
    group: 'Umum',
    initials: '-',
    gender: 'L' as const,
  };
  const summary = calculateStaffSummary(selectedStaff, schedule.days, schedule.totalDays);

  if (staffList.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl p-8 border border-slate-200 dark:border-slate-700 shadow-xs text-center">
        <div className="max-w-md mx-auto space-y-3">
          <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 mx-auto flex items-center justify-center font-bold">
            <User className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">Data Petugas Sedang Kosong</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Semua data jadwal lama telah dibersihkan secara total. Silakan kirimkan data baru untuk dimasukkan ke sistem.
          </p>
        </div>
      </div>
    );
  }

  const [p5Assignments, setP5Assignments] = useState(() => getLocalP5Assignments(schedule.year, schedule.month));
  const [morningPostAssignments, setMorningPostAssignments] = useState(() => getLocalMorningPostAssignments(schedule.year, schedule.month));

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

  // Generate WhatsApp formatted text
  const generateWhatsAppShareText = () => {
    let text = `📋 *JADWAL SHIF WALI ASUH - ${schedule.monthName.toUpperCase()} ${schedule.year}*\n`;
    text += `👤 *Nama:* ${selectedStaff.name}\n`;
    text += `⏱️ *Total Jam Kerja:* ${summary.totalHours} Jam (Pagi: ${summary.pFull}, Sore: ${summary.s}, Malam: ${summary.m}, Libur: ${summary.off})\n\n`;
    text += `*Rincian Penugasan Bulan Ini:*\n`;

    for (let d = 1; d <= schedule.totalDays; d++) {
      const shift = schedule.days[d]?.[selectedStaff.id] || 'O';
      const meta = SHIFT_DEFINITIONS[shift];
      const dObj = new Date(schedule.year, schedule.month - 1, d);
      const dayName = INDONESIAN_DAY_NAMES[dObj.getDay()];
      const p5Task = shift === 'P5' ? p5Assignments[`${d}_${selectedStaff.id}`]?.taskTitle : null;
      const morningAssign = morningPostAssignments[`${d}_${selectedStaff.id}`];
      const morningPost = (shift === 'P1' || shift === 'P2' || shift === 'P3') ? morningAssign?.postTitle : null;
      const medGuard = morningAssign?.medicalGuardLabel;
      const quran = morningAssign?.quranAssistance;
      const extraParts = [
        p5Task ? `Tugas: ${p5Task}` : null,
        morningPost ? `Pos: ${morningPost}` : null,
        medGuard ? `🏥 ${medGuard}` : null,
        quran ? `📖 ${quran}` : null,
      ].filter(Boolean);
      const extraNote = extraParts.length > 0 ? ` [${extraParts.join(' | ')}]` : '';
      text += `• Tgl ${d} (${dayName}): *${shift}*${extraNote} - ${meta.name} (${meta.startTime} - ${meta.endTime})\n`;
    }

    text += `\n_Kementerian Sosial RI - SRT 1 Kab Kediri_`;
    return text;
  };

  const handleCopySchedule = () => {
    const text = generateWhatsAppShareText();
    navigator.clipboard.writeText(text);
    setCopied(true);
    soundManager.playChime();
    setTimeout(() => setCopied(false), 2500);
  };

  // Next 7 days list starting from activeDay
  const upcomingShifts = Array.from({ length: 7 }, (_, i) => {
    let day = activeDay + i;
    if (day > schedule.totalDays) {
      day = day - schedule.totalDays;
    }
    const shift = schedule.days[day]?.[selectedStaff.id] || 'O';
    const meta = SHIFT_DEFINITIONS[shift];
    const dObj = new Date(schedule.year, schedule.month - 1, day);
    const dayName = INDONESIAN_DAY_NAMES[dObj.getDay()];
    return {
      day,
      dayName,
      shift,
      meta,
    };
  });

  // Calendar calculation: Day offset of 1st day of the month (0 = Min, 1 = Sen, ..., 6 = Sab)
  const firstDayIndex = new Date(schedule.year, schedule.month - 1, 1).getDay();
  const todayObj = new Date();
  const isCurrentMonthYear = todayObj.getFullYear() === schedule.year && todayObj.getMonth() === schedule.month - 1;
  const todayDate = isCurrentMonthYear ? todayObj.getDate() : -1;

  return (
    <div className="space-y-2.5">
      {/* Profile Switcher Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            {selectedStaff.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                {selectedStaff.name}
              </h2>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                selectedStaff.gender === 'L'
                  ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
                  : selectedStaff.gender === 'P'
                  ? 'bg-pink-100 text-pink-800 dark:bg-pink-900/50 dark:text-pink-300'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300'
              }`}>
                {selectedStaff.code ? `Kode: ${selectedStaff.code}` : `No. ${selectedStaff.id}`}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {schedule.monthName} {schedule.year} • {selectedStaff.group || 'Wali Asuh'} • SRT 1 Kab Kediri
            </p>
          </div>
        </div>

        {/* Change Profile Dropdown */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
          <label htmlFor="staff-profile-select" className="text-xs font-medium text-slate-500 dark:text-slate-400 shrink-0">
            Profil:
          </label>
          <select
            id="staff-profile-select"
            value={selectedStaffId}
            onChange={(e) => setSelectedStaffId(Number(e.target.value))}
            className="bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-800 dark:text-slate-100 focus:ring-1 focus:ring-blue-500 max-w-[220px] sm:max-w-xs truncate cursor-pointer"
          >
            {staffList.map((st) => (
              <option key={st.id} value={st.id}>
                {st.code ? `[${st.code}] ` : `${st.id}. `}{st.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Overview Cards for User */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {/* Total Hours */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-slate-200 dark:border-slate-700 shadow-xs">
          <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Total Jam Kerja</div>
          <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5 font-mono">
            {summary.totalHours} <span className="text-[10px] font-normal text-slate-400">Jam</span>
          </div>
        </div>

        {/* Pagi */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-sky-200 dark:border-sky-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Shif Pagi (P1/P2)</div>
          <div className="text-lg font-black text-sky-800 dark:text-sky-200 mt-0.5">
            {summary.pFull} <span className="text-[10px] font-normal text-sky-600">Hari</span>
          </div>
          <div className="flex items-center gap-1.5 mt-1 pt-1 border-t border-sky-100 dark:border-sky-900/40 text-[9px] text-slate-600 dark:text-slate-300">
            <span className="font-semibold text-sky-600 dark:text-sky-400" title="Pagi Sesi 1 (07:00-15:00)">P1: {(summary.p1 || 0) + (summary.p || 0)}</span>
            <span>•</span>
            <span className="font-semibold text-teal-600 dark:text-teal-400" title="Pagi Sesi 2 (08:00-16:00)">P2: {summary.p2 || 0}</span>
          </div>
        </div>

        {/* Sore */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-orange-200 dark:border-orange-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-orange-700 dark:text-orange-300">Shif Sore (S)</div>
          <div className="text-lg font-black text-orange-800 dark:text-orange-200 mt-0.5">
            {summary.s} <span className="text-[10px] font-normal text-orange-600">Hari</span>
          </div>
          {(summary.s2a !== undefined || summary.s3a !== undefined || summary.s4a !== undefined) && (
            <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-orange-100 dark:border-orange-900/40 text-[9px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-purple-600 dark:text-purple-400" title="Kantin SMP">S2A:{summary.s2a || 0}</span>
              <span>•</span>
              <span className="font-semibold text-orange-600 dark:text-orange-400" title="Kantin SMA">S3A:{summary.s3a || 0}</span>
              <span>•</span>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400" title="Jaga Masjid">S4A:{summary.s4a || 0}</span>
            </div>
          )}
        </div>

        {/* Malam */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-blue-200 dark:border-blue-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-blue-700 dark:text-blue-300">Shif Malam (M)</div>
          <div className="text-lg font-black text-blue-800 dark:text-blue-200 mt-0.5">
            {summary.m} <span className="text-[10px] font-normal text-blue-600">Hari</span>
          </div>
          {(summary.m1 !== undefined || summary.m2 !== undefined || summary.m3 !== undefined) && (
            <div className="flex flex-wrap gap-1 mt-1 pt-1 border-t border-blue-100 dark:border-blue-900/40 text-[9px] text-slate-600 dark:text-slate-300">
              <span className="font-semibold text-indigo-600 dark:text-indigo-400" title="Malam Sesi 1 (s.d 00:00)">M1: {summary.m1 || 0}</span>
              <span>•</span>
              <span className="font-semibold text-blue-600 dark:text-blue-400" title="Malam Sesi 2 (Subuh-07:00)">M2: {summary.m2 || 0}</span>
              <span>•</span>
              <span className="font-semibold text-fuchsia-600 dark:text-fuchsia-400" title="Malam Pendamping (23:00-07:00)">M3: {summary.m3 || 0}</span>
            </div>
          )}
        </div>

        {/* Lepas Piket */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-sky-200 dark:border-sky-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-sky-700 dark:text-sky-300">Lepas Piket (LP)</div>
          <div className="text-lg font-black text-sky-800 dark:text-sky-200 mt-0.5">
            {summary.lp} <span className="text-[10px] font-normal text-sky-600">Hari</span>
          </div>
        </div>

        {/* Off / Libur */}
        <div className="bg-white dark:bg-slate-800 rounded-lg p-2 border border-red-200 dark:border-red-900/60 shadow-xs">
          <div className="text-[10px] font-semibold text-red-700 dark:text-red-300">Hari Libur (OFF/L)</div>
          <div className="text-lg font-black text-red-800 dark:text-red-200 mt-0.5">
            {summary.off} <span className="text-[10px] font-normal text-red-600">Hari</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar View & Upcoming Duties */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Calendar View (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <CalendarIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                Kalender Shif Bulanan ({schedule.monthName} {schedule.year})
              </h3>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              <button
                type="button"
                onClick={() => setIsIcsModalOpen(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-semibold hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors cursor-pointer"
                title="Ekspor pengingat tugas harian & shif ke kalender pribadi Google Calendar / Outlook (.ics)"
              >
                <CalendarIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                <span>Sinkron Kalender (.ICS)</span>
              </button>

              <button
                onClick={handleCopySchedule}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold hover:bg-emerald-100 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3" />
                    <span>Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Salin WA</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Monthly Day Grid */}
          <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((dayH, i) => (
              <div 
                key={i} 
                className={`text-center text-[10px] font-bold uppercase py-0.5 ${
                  i === 0 ? 'text-rose-500 font-extrabold' : 'text-slate-400'
                }`}
              >
                {dayH}
              </div>
            ))}

            {/* Empty slots for days prior to the 1st of the month */}
            {Array.from({ length: firstDayIndex }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="rounded-lg p-1.5 border border-dashed border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/20 min-h-[50px] opacity-30 select-none"
                aria-hidden="true"
              />
            ))}

            {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((day) => {
              const shift = schedule.days[day]?.[selectedStaff.id] || 'O';
              const meta = SHIFT_DEFINITIONS[shift];
              const isSelected = day === activeDay;
              const isToday = isCurrentMonthYear && day === todayDate;
              const dayOfWeek = (firstDayIndex + day - 1) % 7;
              const isSunday = dayOfWeek === 0;
              const p5Task = shift === 'P5' ? p5Assignments[`${day}_${selectedStaff.id}`]?.taskTitle : null;
              const morningAssignment = morningPostAssignments[`${day}_${selectedStaff.id}`];
              const morningPost = (shift === 'P1' || shift === 'P2' || shift === 'P3') ? morningAssignment?.postTitle : null;
              const quranAssistance = morningAssignment?.quranAssistance;
              const medicalGuardLabel = morningAssignment?.medicalGuardLabel;

              return (
                <div
                  key={day}
                  onClick={() => {
                    setActiveDay(day);
                    onNavigateToTab('dashboard');
                  }}
                  className={`cursor-pointer rounded-lg p-1.5 border transition-all text-center flex flex-col justify-between min-h-[50px] ${
                    isSelected
                      ? 'ring-2 ring-blue-600 shadow-sm bg-blue-50/70 dark:bg-blue-950/50 border-blue-400'
                      : isToday
                      ? 'border-emerald-400 dark:border-emerald-500 bg-emerald-50/40 dark:bg-emerald-950/30 shadow-2xs'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-400 bg-white dark:bg-slate-800/80 hover:shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={isSunday ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-300'}>
                      Tgl {day}
                    </span>
                    {isToday && (
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" title="Hari Ini"></span>
                    )}
                  </div>

                  <div className="my-0.5">
                    <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-black ${meta.badgeClass}`}>
                      {shift}
                    </span>
                    {(p5Task || morningPost) && (
                      <div className="text-[8px] font-bold text-sky-700 dark:text-sky-300 truncate mt-0.5" title={p5Task || morningPost || ''}>
                        {p5Task || morningPost}
                      </div>
                    )}
                    {quranAssistance && (
                      <div className="text-[7.5px] font-bold text-emerald-700 dark:text-emerald-300 truncate mt-0.5" title={`Pendampingan: ${quranAssistance}`}>
                        📖 {quranAssistance}
                      </div>
                    )}
                    {medicalGuardLabel && (
                      <div className="text-[7.5px] font-bold text-rose-700 dark:text-rose-300 truncate mt-0.5" title={`Penyematan: ${medicalGuardLabel}`}>
                        🏥 {medicalGuardLabel}
                      </div>
                    )}
                  </div>

                  <div className="text-[9px] text-slate-500 dark:text-slate-400 truncate">
                    {meta.startTime}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Next 7 Days Upcoming Duties & Alarms */}
        <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                7 Hari Kedepan
              </h3>
            </div>
            <span className="text-[10px] text-slate-400">Mulai Tgl {activeDay}</span>
          </div>

          <div className="space-y-1.5">
            {upcomingShifts.map((item, idx) => {
              const p5Task = item.shift === 'P5' ? p5Assignments[`${item.day}_${selectedStaff.id}`]?.taskTitle : null;
              const itemAssignment = morningPostAssignments[`${item.day}_${selectedStaff.id}`];
              const morningPost = (item.shift === 'P1' || item.shift === 'P2' || item.shift === 'P3') ? itemAssignment?.postTitle : null;
              const itemQuran = itemAssignment?.quranAssistance;
              const itemMedGuard = itemAssignment?.medicalGuardLabel;
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-1.5 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className={`w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] ${item.meta.badgeClass}`}>
                      {item.shift}
                    </span>
                    <div>
                      <div className="font-bold text-[11px] text-slate-900 dark:text-white flex items-center gap-1 flex-wrap">
                        <span>{item.dayName}, {item.day} {schedule.monthName}</span>
                        {(p5Task || morningPost) && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-sky-100 dark:bg-sky-900/50 text-sky-800 dark:text-sky-300">
                            {p5Task || morningPost}
                          </span>
                        )}
                        {itemQuran && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                            📖 {itemQuran}
                          </span>
                        )}
                        {itemMedGuard && (
                          <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-200 border border-rose-300 dark:border-rose-800">
                            🏥 {itemMedGuard}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500 truncate max-w-[140px]">
                        {item.meta.name} • {item.meta.startTime}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      notificationService.triggerNotification(
                        `Pengingat Shif ${item.meta.name}`,
                        {
                          body: `Jadwal ${item.dayName}, ${item.day} ${schedule.monthName}: ${item.meta.name} (${item.meta.startTime} - ${item.meta.endTime})${p5Task ? ` [Tugas: ${p5Task}]` : ''}${morningPost ? ` [Pos: ${morningPost}]` : ''}${itemMedGuard ? ` [🏥 ${itemMedGuard}]` : ''}${itemQuran ? ` [Mengaji: ${itemQuran}]` : ''}`,
                          sound: 'chime',
                        }
                      );
                    }}
                    className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-amber-500 transition-colors"
                    title="Bunyikan Uji Alarm"
                  >
                    <Bell className="w-3 h-3" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="pt-1.5 border-t border-slate-200 dark:border-slate-700 space-y-1.5">
            <button
              onClick={() => setIsIcsModalOpen(true)}
              className="w-full py-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
            >
              <CalendarIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span>Ekspor ke Kalender HP (.ICS)</span>
            </button>

            <button
              onClick={() => onNavigateToTab('notifications')}
              className="w-full py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors flex items-center justify-center gap-1"
            >
              <BellRing className="w-3 h-3 text-slate-600 dark:text-slate-300" />
              <span>Atur Alarm & Notifikasi</span>
            </button>
          </div>
        </div>
      </div>

      {/* ICS Calendar Export Modal */}
      <IcsExportModal
        isOpen={isIcsModalOpen}
        onClose={() => setIsIcsModalOpen(false)}
        staff={selectedStaff}
        schedule={schedule}
        activeDay={activeDay}
        sopTasks={sopTasks}
      />
    </div>
  );
};
