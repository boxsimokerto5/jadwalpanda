import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowLeftRight, 
  ShieldCheck, 
  Calendar, 
  User, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  RotateCcw, 
  History, 
  Search, 
  Sparkles, 
  Info, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Sliders,
  Check,
  FileSpreadsheet,
  ArrowRight,
  Shield,
  HelpCircle,
  Megaphone,
  Save,
  GraduationCap,
  MapPin,
  Edit3,
  Upload
} from 'lucide-react';
import { P5TaskAdminManager } from './P5TaskAdminManager';
import { MorningPostAdminManager } from './MorningPostAdminManager';
import { ImportScheduleModal } from './ImportScheduleModal';
import { MonthSchedule, Staff, ShiftCode, ShiftSwapRecord, AnnouncementData, MorningPostAssignment, MorningPostCustomOption } from '../types';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';
import { INDONESIAN_DAY_NAMES, INDONESIAN_MONTH_NAMES, validateShiftAssignment } from '../utils/scheduler';
import { soundManager } from '../utils/audio';
import { notificationService } from '../utils/notification';
import { 
  subscribeToSwapLogs, 
  saveSwapLogsToSupabase,
  subscribeToAnnouncement,
  saveAnnouncementToSupabase,
  getLocalAnnouncement,
  DEFAULT_ANNOUNCEMENT
} from '../utils/supabaseBackend';
import {
  getLocalMorningPostAssignments,
  subscribeToMorningPostAssignments,
  saveMorningPostAssignmentToSupabase,
  deleteMorningPostAssignment,
  getLocalMorningPostOptions,
  subscribeToMorningPostOptions
} from '../utils/morningPostService';
import { MorningPostAssignmentModal } from './MorningPostAssignmentModal';
import { isSupabaseConfigured, saveScheduleToSupabase } from '../utils/supabaseService';

interface AdminShiftSwapViewProps {
  schedule: MonthSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthSchedule>>;
  staffList: Staff[];
  activeDay: number;
  setActiveDay: (day: number) => void;
  onNavigateToMatrix?: () => void;
  onNavigateToDashboard?: () => void;
  onImportSchedule?: (newSchedule: MonthSchedule) => void;
}

const SWAP_REASONS = [
  'Keperluan Keluarga / Acara Pribadi',
  'Tugas Dinas / Kegiatan Luar Sekolah',
  'Kondisi Kesehatan / Kurang Fit',
  'Kesepakatan Saling Tukar Piket',
  'Penyesuaian Kegiatan Asrama & Santri',
  'Izin Khusus Pimpinan / Kepala Sekolah',
];

const AVAILABLE_SHIFTS: ShiftCode[] = ['P1', 'P2', 'P3', 'P4', 'P5', 'S2A', 'S3A', 'S4A', 'M', 'M1', 'M2', 'M3', 'LP', 'O', 'C'];

export const AdminShiftSwapView: React.FC<AdminShiftSwapViewProps> = ({
  schedule,
  setSchedule,
  staffList,
  activeDay,
  setActiveDay,
  onNavigateToMatrix,
  onNavigateToDashboard,
  onImportSchedule,
}) => {
  // Modal Import CSV state
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);

  // Mode selection: 'swap' (2 staff 1 day), 'override' (1 staff 1 day), 'cross_day' (2 staff 2 days)
  const [activeMode, setActiveMode] = useState<'swap' | 'override' | 'cross_day'>('swap');

  // Selected staff states
  const [staff1Id, setStaff1Id] = useState<number>(() => staffList[0]?.id || 1);
  const [staff2Id, setStaff2Id] = useState<number>(() => staffList[1]?.id || (staffList[0]?.id || 1));

  // Single Override target shift
  const [overrideShift, setOverrideShift] = useState<ShiftCode>('P1');

  // Cross day states
  const [crossDay2, setCrossDay2] = useState<number>(() => Math.min(activeDay + 1, schedule.totalDays));

  // Reason
  const [reason, setReason] = useState<string>('');
  const [customReason, setCustomReason] = useState<string>('');

  // Filter for staff roster list
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [genderFilter, setGenderFilter] = useState<'ALL' | 'L' | 'P'>('ALL');

  // Toast notification state
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Morning Post Assignments state and live subscription
  const [morningPostAssignments, setMorningPostAssignments] = useState<Record<string, MorningPostAssignment>>(() =>
    getLocalMorningPostAssignments(schedule.year, schedule.month)
  );
  const [morningPostOptions, setMorningPostOptions] = useState<MorningPostCustomOption[]>(() =>
    getLocalMorningPostOptions()
  );
  const [morningPostModalTarget, setMorningPostModalTarget] = useState<{ day: number; staff: Staff; shiftCode: 'P1' | 'P2' | 'P3' } | null>(null);

  useEffect(() => {
    const unsubAssign = subscribeToMorningPostAssignments(schedule.year, schedule.month, (data) => {
      setMorningPostAssignments(data);
    });
    const handleUpdate = () => {
      setMorningPostAssignments(getLocalMorningPostAssignments(schedule.year, schedule.month));
    };
    window.addEventListener('morning_post_assignments_updated', handleUpdate);

    const unsubOpts = subscribeToMorningPostOptions((opts) => {
      setMorningPostOptions(opts);
    });

    return () => {
      unsubAssign();
      window.removeEventListener('morning_post_assignments_updated', handleUpdate);
      unsubOpts();
    };
  }, [schedule.year, schedule.month]);

  // Morning staff scheduled on activeDay
  const morningStaffOnActiveDay = useMemo(() => {
    return staffList.filter((st) => {
      const s = schedule.days[activeDay]?.[st.id];
      return s === 'P1' || s === 'P2' || s === 'P3' || s === 'P';
    });
  }, [staffList, schedule.days, activeDay]);

  const handleAssignMorningPost = async (staff: Staff, shiftCode: 'P1' | 'P2' | 'P3', postTitle: string) => {
    const assignment: MorningPostAssignment = {
      staffId: staff.id,
      day: activeDay,
      month: schedule.month,
      year: schedule.year,
      shiftCode,
      postTitle,
      updatedBy: 'Admin'
    };

    setMorningPostAssignments(prev => ({
      ...prev,
      [`${activeDay}_${staff.id}`]: assignment
    }));

    await saveMorningPostAssignmentToSupabase(assignment);
    soundManager.playChime();
    setToastMessage({
      type: 'success',
      text: `Pos "${postTitle}" berhasil ditetapkan untuk ${staff.name} pada Tgl ${activeDay}!`
    });
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleClearMorningPost = async (staff: Staff) => {
    setMorningPostAssignments(prev => {
      const copy = { ...prev };
      delete copy[`${activeDay}_${staff.id}`];
      return copy;
    });

    await deleteMorningPostAssignment(schedule.year, schedule.month, activeDay, staff.id);
    soundManager.playClick();
    setToastMessage({
      type: 'info',
      text: `Penugasan pos untuk ${staff.name} pada Tgl ${activeDay} direset.`
    });
    setTimeout(() => setToastMessage(null), 3000);
  };

  // History logs stored in Supabase with localStorage fallback
  const [swapLogs, setSwapLogs] = useState<ShiftSwapRecord[]>(() => {
    try {
      const saved = localStorage.getItem(`wali_asuh_swap_logs_${schedule.year}_${schedule.month}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to Supabase swap logs
  useEffect(() => {
    const unsubscribe = subscribeToSwapLogs(schedule.year, schedule.month, (cloudLogs) => {
      if (cloudLogs && Array.isArray(cloudLogs)) {
        setSwapLogs(cloudLogs);
        try {
          localStorage.setItem(`wali_asuh_swap_logs_${schedule.year}_${schedule.month}`, JSON.stringify(cloudLogs));
        } catch {}
      }
    });
    return () => unsubscribe();
  }, [schedule.year, schedule.month]);

  // Helper to update logs state, persist locally, and push to Supabase without infinite loops
  const persistSwapLogs = (updatedLogs: ShiftSwapRecord[]) => {
    setSwapLogs(updatedLogs);
    try {
      localStorage.setItem(`wali_asuh_swap_logs_${schedule.year}_${schedule.month}`, JSON.stringify(updatedLogs));
      saveSwapLogsToSupabase(schedule.year, schedule.month, updatedLogs);
    } catch (e) {
      console.warn('Failed to save swap logs:', e);
    }
  };

  // Show auto-dismissing toast
  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // Announcement Ticker state & synchronization
  const [announcement, setAnnouncement] = useState<AnnouncementData>(() => getLocalAnnouncement());
  const [announcementInput, setAnnouncementInput] = useState<string>(() => getLocalAnnouncement().text);
  const [announcementEnabled, setAnnouncementEnabled] = useState<boolean>(() => getLocalAnnouncement().enabled);
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToAnnouncement((data) => {
      setAnnouncement(data);
      setAnnouncementInput(data.text);
      setAnnouncementEnabled(data.enabled);
    });
    return () => unsub();
  }, []);

  const handleSaveAnnouncement = async () => {
    setIsSavingAnnouncement(true);
    const newText = announcementInput.trim() || DEFAULT_ANNOUNCEMENT.text;
    const ok = await saveAnnouncementToSupabase({
      text: newText,
      enabled: announcementEnabled,
    }, 'Admin SRT 1');
    setIsSavingAnnouncement(false);
    if (ok) {
      soundManager.playChime();
      showToast('success', 'Pengumuman berjalan berhasil disimpan & langsung tersinkron ke Beranda!');
    } else {
      showToast('info', 'Pengumuman disimpan secara lokal.');
    }
  };

  // Current day string representation
  const dateObj = useMemo(() => {
    return new Date(schedule.year, schedule.month - 1, activeDay);
  }, [schedule.year, schedule.month, activeDay]);

  const dayName = INDONESIAN_DAY_NAMES[dateObj.getDay()];
  const monthName = INDONESIAN_MONTH_NAMES[schedule.month - 1];

  // Helper to get shift for staff on a specific day
  const getStaffShiftOnDay = (staffId: number, day: number): ShiftCode => {
    return schedule.days[day]?.[staffId] || 'O';
  };

  // Shift values for Staff 1 and Staff 2
  const staff1CurrentShift = getStaffShiftOnDay(staff1Id, activeDay);
  const staff2CurrentShift = getStaffShiftOnDay(staff2Id, activeMode === 'cross_day' ? crossDay2 : activeDay);

  const staff1Obj = useMemo(() => staffList.find((s) => s.id === staff1Id), [staffList, staff1Id]);
  const staff2Obj = useMemo(() => staffList.find((s) => s.id === staff2Id), [staffList, staff2Id]);

  // Day 2 info for cross-day mode
  const crossDateObj2 = useMemo(() => {
    return new Date(schedule.year, schedule.month - 1, crossDay2);
  }, [schedule.year, schedule.month, crossDay2]);
  const dayName2 = INDONESIAN_DAY_NAMES[crossDateObj2.getDay()];

  // Filtered staff list for the roster table
  const filteredStaffList = useMemo(() => {
    return staffList.filter((st) => {
      const matchesSearch = st.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (st.code && st.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (st.jenjang && st.jenjang.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesGender = genderFilter === 'ALL' || st.gender === genderFilter;
      return matchesSearch && matchesGender;
    });
  }, [staffList, searchQuery, genderFilter]);

  // Summary counts for the selected day
  const dayShiftCounts = useMemo(() => {
    const counts: Record<string, number> = {
      P1: 0,
      P2: 0,
      P5: 0,
      S2A: 0,
      S3A: 0,
      S4A: 0,
      M: 0,
      LP: 0,
      O: 0,
      C: 0,
    };
    staffList.forEach((st) => {
      const code = getStaffShiftOnDay(st.id, activeDay);
      if (counts[code] !== undefined) {
        counts[code]++;
      } else {
        counts[code] = 1;
      }
    });
    return counts;
  }, [staffList, schedule.days, activeDay]);

  // Execution: Execute Swap Shift
  const handleExecuteSwap = () => {
    if (staff1Id === staff2Id) {
      showToast('error', 'Petugas 1 dan Petugas 2 tidak boleh orang yang sama.');
      soundManager.playBell();
      return;
    }

    if (staff1CurrentShift === staff2CurrentShift) {
      showToast('info', `Kedua petugas sudah memiliki shift yang sama (${staff1CurrentShift}) pada tanggal ini.`);
      return;
    }

    const finalReason = customReason.trim() || reason || 'Tukar shift jadwal atas persetujuan bersama';

    // Update schedule - STRICTLY ISOLATED: Only swaps staff1 and staff2 on activeDay
    const nowIso = new Date().toISOString();
    setSchedule((prev) => {
      const newDays = { ...prev.days };
      const currentDayShifts = { ...(newDays[activeDay] || {}) };

      // Swap the shifts between only these two staff members
      currentDayShifts[staff1Id] = staff2CurrentShift;
      currentDayShifts[staff2Id] = staff1CurrentShift;
      newDays[activeDay] = currentDayShifts;

      const updated = {
        ...prev,
        days: newDays,
        updatedAt: nowIso,
        updatedBy: 'Admin Tukar Shift',
      };
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v15_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v14_${prev.year}_${prev.month}`, JSON.stringify(updated));
      } catch {}
      if (isSupabaseConfigured()) {
        saveScheduleToSupabase(updated, 'Admin Tukar Shift').catch(() => {});
      }
      return updated;
    });

    // Create log record
    const newLog: ShiftSwapRecord = {
      id: `swap_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      year: schedule.year,
      month: schedule.month,
      type: 'swap',
      day1: activeDay,
      staff1Id,
      staff1Name: staff1Obj?.name || `Petugas #${staff1Id}`,
      staff1OldShift: staff1CurrentShift,
      staff1NewShift: staff2CurrentShift,
      staff2Id,
      staff2Name: staff2Obj?.name || `Petugas #${staff2Id}`,
      staff2OldShift: staff2CurrentShift,
      staff2NewShift: staff1CurrentShift,
      reason: finalReason,
    };

    persistSwapLogs([newLog, ...swapLogs]);
    soundManager.playChime();

    // Validasi penugasan shif M3: jika salah satu staf ditugaskan M3, sistem otomatis memicu pengingat khusus
    if (staff2CurrentShift === 'M3' && staff1Obj) {
      const val = validateShiftAssignment(staff1Obj, 'M3', activeDay, schedule.days);
      if (val.hasSpecialReminder && val.specialReminder) {
        notificationService.triggerNotification(val.specialReminder.title, {
          body: val.specialReminder.message,
          sound: 'bell',
        });
      }
    }
    if (staff1CurrentShift === 'M3' && staff2Obj) {
      const val = validateShiftAssignment(staff2Obj, 'M3', activeDay, schedule.days);
      if (val.hasSpecialReminder && val.specialReminder) {
        notificationService.triggerNotification(val.specialReminder.title, {
          body: val.specialReminder.message,
          sound: 'bell',
        });
      }
    }

    const m3Notice = (staff2CurrentShift === 'M3' || staff1CurrentShift === 'M3') 
      ? ' ⏰ [Pengingat M3 Otomatis]: Wajib keliling asrama jam 23:00 & kirim foto ke grup dinas!'
      : '';

    showToast(
      'success',
      `Berhasil menukar shif: ${staff1Obj?.name} (${staff2CurrentShift}) ⇄ ${staff2Obj?.name} (${staff1CurrentShift}) pada tanggal ${activeDay} ${monthName}.${m3Notice}`
    );
  };

  // Execution: Single Shift Override - STRICTLY ISOLATED: Only updates staff1 on activeDay
  const handleExecuteOverride = () => {
    if (staff1CurrentShift === overrideShift) {
      if (isSupabaseConfigured()) {
        saveScheduleToSupabase(schedule, 'Admin Penyesuaian Shift').catch(() => {});
      }
      showToast('success', `${staff1Obj?.name || 'Petugas'} dikonfirmasi tetap dengan shif [${overrideShift}] (tersinkron ke database).`);
      return;
    }

    const finalReason = customReason.trim() || reason || 'Penyesuaian shift tunggal oleh Admin';

    const nowIso = new Date().toISOString();
    setSchedule((prev) => {
      const newDays = { ...prev.days };
      const currentDayShifts = { ...(newDays[activeDay] || {}) };
      currentDayShifts[staff1Id] = overrideShift;
      newDays[activeDay] = currentDayShifts;

      const updated = {
        ...prev,
        days: newDays,
        updatedAt: nowIso,
        updatedBy: 'Admin Penyesuaian Shift',
      };
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v15_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v14_${prev.year}_${prev.month}`, JSON.stringify(updated));
      } catch {}
      if (isSupabaseConfigured()) {
        saveScheduleToSupabase(updated, 'Admin Penyesuaian Shift').catch(() => {});
      }
      return updated;
    });

    const newLog: ShiftSwapRecord = {
      id: `override_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      year: schedule.year,
      month: schedule.month,
      type: 'override',
      day1: activeDay,
      staff1Id,
      staff1Name: staff1Obj?.name || `Petugas #${staff1Id}`,
      staff1OldShift: staff1CurrentShift,
      staff1NewShift: overrideShift,
      reason: finalReason,
    };

    persistSwapLogs([newLog, ...swapLogs]);
    soundManager.playChime();

    // Validasi penugasan shif M3: jika ditugaskan M3, sistem otomatis memicu pengingat khusus
    if (overrideShift === 'M3' && staff1Obj) {
      const val = validateShiftAssignment(staff1Obj, 'M3', activeDay, schedule.days);
      if (val.hasSpecialReminder && val.specialReminder) {
        notificationService.triggerNotification(val.specialReminder.title, {
          body: val.specialReminder.message,
          sound: 'bell',
        });
      }
    }

    const m3Notice = overrideShift === 'M3' 
      ? ' ⏰ [Pengingat M3 Otomatis]: Wajib keliling asrama jam 23:00 & kirim foto ke grup dinas!'
      : '';

    showToast(
      'success',
      `Shift ${staff1Obj?.name} pada tgl ${activeDay} ${monthName} berhasil diubah menjadi [${overrideShift}].${m3Notice}`
    );
  };

  // Execution: Cross-Day Swap
  const handleExecuteCrossDaySwap = () => {
    if (staff1Id === staff2Id && activeDay === crossDay2) {
      showToast('error', 'Petugas dan tanggal tidak boleh sama persis.');
      return;
    }

    const finalReason = customReason.trim() || reason || 'Tukar shift silang antar tanggal';

    const nowIso = new Date().toISOString();
    setSchedule((prev) => {
      const newDays = { ...prev.days };

      // Day 1
      const day1Shifts = { ...(newDays[activeDay] || {}) };
      day1Shifts[staff1Id] = staff2CurrentShift;
      newDays[activeDay] = day1Shifts;

      // Day 2
      const day2Shifts = { ...(newDays[crossDay2] || {}) };
      day2Shifts[staff2Id] = staff1CurrentShift;
      newDays[crossDay2] = day2Shifts;

      const updated = {
        ...prev,
        days: newDays,
        updatedAt: nowIso,
        updatedBy: 'Admin Tukar Shift Silang',
      };
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v15_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v14_${prev.year}_${prev.month}`, JSON.stringify(updated));
      } catch {}
      saveScheduleToSupabase(updated, 'Admin Tukar Shift Silang').catch(() => {});
      return updated;
    });

    const newLog: ShiftSwapRecord = {
      id: `cross_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toLocaleString('id-ID'),
      year: schedule.year,
      month: schedule.month,
      type: 'cross_day',
      day1: activeDay,
      staff1Id,
      staff1Name: staff1Obj?.name || `Petugas #${staff1Id}`,
      staff1OldShift: staff1CurrentShift,
      staff1NewShift: staff2CurrentShift,
      day2: crossDay2,
      staff2Id,
      staff2Name: staff2Obj?.name || `Petugas #${staff2Id}`,
      staff2OldShift: staff2CurrentShift,
      staff2NewShift: staff1CurrentShift,
      reason: finalReason,
    };

    persistSwapLogs([newLog, ...swapLogs]);
    soundManager.playChime();
    showToast(
      'success',
      `Berhasil menukar jadwal silang: ${staff1Obj?.name} (Tgl ${activeDay}: ${staff2CurrentShift}) ⇄ ${staff2Obj?.name} (Tgl ${crossDay2}: ${staff1CurrentShift}).`
    );
  };

  // Undo a specific log
  const handleUndoLog = (log: ShiftSwapRecord) => {
    if (log.undone) return;

    const nowIso = new Date().toISOString();
    setSchedule((prev) => {
      const newDays = { ...prev.days };

      if (log.type === 'swap') {
        const dayShifts = { ...(newDays[log.day1] || {}) };
        dayShifts[log.staff1Id] = log.staff1OldShift;
        if (log.staff2Id) {
          dayShifts[log.staff2Id] = log.staff2OldShift || 'O';
        }
        newDays[log.day1] = dayShifts;
      } else if (log.type === 'override') {
        const dayShifts = { ...(newDays[log.day1] || {}) };
        dayShifts[log.staff1Id] = log.staff1OldShift;
        newDays[log.day1] = dayShifts;
      } else if (log.type === 'cross_day' && log.day2 && log.staff2Id) {
        const day1Shifts = { ...(newDays[log.day1] || {}) };
        day1Shifts[log.staff1Id] = log.staff1OldShift;
        newDays[log.day1] = day1Shifts;

        const day2Shifts = { ...(newDays[log.day2] || {}) };
        day2Shifts[log.staff2Id] = log.staff2OldShift || 'O';
        newDays[log.day2] = day2Shifts;
      }

      const updated = {
        ...prev,
        days: newDays,
        updatedAt: nowIso,
        updatedBy: 'Admin Undo Tukar Shift',
      };
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v15_${prev.year}_${prev.month}`, JSON.stringify(updated));
        localStorage.setItem(`wali_asuh_schedule_v14_${prev.year}_${prev.month}`, JSON.stringify(updated));
      } catch {}
      saveScheduleToSupabase(updated, 'Admin Undo Tukar Shift').catch(() => {});
      return updated;
    });

    // Mark as undone
    persistSwapLogs(
      swapLogs.map((item) => (item.id === log.id ? { ...item, undone: true } : item))
    );

    soundManager.playDigital();
    showToast('info', `Perubahan berhasil dibatalkan (Undo) dan jadwal dikembalikan.`);
  };

  // Clear all logs
  const handleClearLogs = () => {
    if (window.confirm('Yakin ingin menghapus seluruh catatan riwayat penukaran shift bulan ini?')) {
      persistSwapLogs([]);
      showToast('info', 'Riwayat penukaran shift telah dibersihkan.');
    }
  };

  // Helper to render shift badge with styling
  const renderShiftBadge = (code: ShiftCode, size: 'sm' | 'md' | 'lg' = 'md') => {
    const def = SHIFT_DEFINITIONS[code] || {
      code,
      name: code,
      startTime: '',
      endTime: '',
      color: '#64748b',
      bgLight: 'bg-slate-100 text-slate-800 border-slate-300',
      bgDark: 'dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700',
      badgeClass: 'bg-slate-600 text-white',
      description: '',
    };

    const sizeClasses = {
      sm: 'px-1.5 py-0.5 text-[10px]',
      md: 'px-2 py-0.5 text-xs font-bold',
      lg: 'px-3 py-1.5 text-sm font-extrabold',
    };

    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md border font-mono ${def.bgLight} ${def.bgDark} ${sizeClasses[size]} shadow-2xs`}
      >
        <span>{code}</span>
        {def.startTime && (
          <span className="text-[10px] opacity-75 font-normal">
            ({def.startTime}-{def.endTime})
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-semibold transition-all transform animate-in fade-in slide-in-from-bottom-5 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : toastMessage.type === 'error'
              ? 'bg-rose-600 text-white border-rose-500'
              : 'bg-blue-600 text-white border-blue-500'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0" />
          ) : toastMessage.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 shrink-0" />
          ) : (
            <Info className="w-5 h-5 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 hover:opacity-75 text-xs bg-white/20 px-1.5 py-0.5 rounded cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 text-white p-3.5 sm:p-4 rounded-xl border border-blue-900/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-blue-600 text-white rounded-lg shadow-xs">
              <ShieldCheck className="w-4 h-4" />
            </span>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Pusat Kontrol Admin: Tukar & Kelola Shif
            </h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-slate-950 uppercase tracking-wider">
              Akses Admin
            </span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed max-w-2xl">
            Tukar jadwal shift antar wali asuh atau ubah penugasan secara instan. Perubahan akan <strong>otomatis tersinkronisasi secara real-time</strong> ke Dashboard Beranda, Matriks Roster, Jadwal Pribadi, dan Laporan Cetak Resmi.
          </p>
        </div>

        {/* Quick Shortcut Buttons */}
        <div className="flex items-center gap-2 self-stretch sm:self-auto shrink-0">
          {onNavigateToDashboard && (
            <button
              onClick={onNavigateToDashboard}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 border border-white/15 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Lihat Beranda</span>
            </button>
          )}
          {onNavigateToMatrix && (
            <button
              onClick={onNavigateToMatrix}
              className="flex-1 sm:flex-none px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Buka Matriks Roster</span>
            </button>
          )}
        </div>
      </div>

      {/* Pengumuman Berjalan (Ticker) Management Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 sm:p-4 border border-amber-300/80 dark:border-amber-700/60 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2.5 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              <Megaphone className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Pengumuman Berjalan (Ticker Dashboard)</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                  announcementEnabled 
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300' 
                    : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                }`}>
                  {announcementEnabled ? 'Aktif' : 'Nonaktif'}
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Teks berjalan yang tampil di bagian atas dashboard beranda untuk seluruh wali asuh.
              </p>
            </div>
          </div>

          {/* Toggle Switch */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              {announcementEnabled ? 'Tampilkan di Beranda' : 'Sembunyikan'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={announcementEnabled}
                onChange={(e) => setAnnouncementEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
            </label>
          </div>
        </div>

        {/* Live Preview Box */}
        {announcementEnabled && announcementInput && (
          <div className="bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-lg px-2.5 py-1.5 flex items-center gap-2 overflow-hidden shadow-2xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300 shrink-0 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping"></span>
              Pratinjau:
            </span>
            <div className="relative flex-1 overflow-hidden h-5 flex items-center">
              <div className="animate-continuous-marquee text-xs font-semibold text-amber-950 dark:text-amber-100 whitespace-nowrap select-none">
                <span className="inline-flex items-center gap-5 pr-8">
                  <span>{announcementInput}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 shrink-0"></span>
                  <span>{announcementInput}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 shrink-0"></span>
                </span>
                <span className="inline-flex items-center gap-5 pr-8" aria-hidden="true">
                  <span>{announcementInput}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 shrink-0"></span>
                  <span>{announcementInput}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70 shrink-0"></span>
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Input Textarea & Controls */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Isi Teks Pengumuman
            </label>
            <span className="text-[10px] text-slate-400 font-mono">
              {announcementInput.length} karakter
            </span>
          </div>

          <textarea
            rows={2}
            value={announcementInput}
            onChange={(e) => setAnnouncementInput(e.target.value)}
            placeholder="Tuliskan pengumuman resmi atau aturan operasional kedinasan..."
            className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none leading-relaxed"
          />

          {/* Quick Presets */}
          <div className="space-y-1">
            <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Pilihan Cepat / Rekomendasi:
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setAnnouncementInput('📢 Pengumuman: Shif Sore tidak dapat ditukar dengan Shif Malam (M), karena memiliki jam kerja yang sama & ketentuan operasional asrama.')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                ⚠️ Shif Sore tidak dapat ditukar dengan Shif M
              </button>
              <button
                type="button"
                onClick={() => setAnnouncementInput('⚠️ Perhatian: Serah terima tugas dan buku jaga wajib diisi lengkap setiap pergantian shif melalui menu Laporan Serah Terima.')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                📋 Kewajiban Isi Laporan Serah Terima
              </button>
              <button
                type="button"
                onClick={() => setAnnouncementInput('⏱️ Disiplin Piket: Seluruh Wali Asuh wajib hadir 15 menit sebelum jam shif dimulai untuk apel operan jaga.')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-700/60 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-slate-700 dark:text-slate-300 font-medium transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
              >
                ⏱️ Hadir 15 Menit Sebelum Shif
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              disabled={isSavingAnnouncement}
              onClick={handleSaveAnnouncement}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSavingAnnouncement ? 'Menyimpan...' : 'Simpan & Publikasikan Pengumuman'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Pengaturan Pilihan Tugas Shif P5 (Keterampilan / Vokasi) */}
      <P5TaskAdminManager />

      {/* Pengaturan Pilihan Pos Shif P1 & P2 (UKS SD/SMP/SMA / Mobile / Kustom) */}
      <MorningPostAdminManager />

      {/* Date Picker & Mode Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Date Selector Navigation */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 shadow-2xs">
            <button
              onClick={() => setActiveDay(Math.max(1, activeDay - 1))}
              disabled={activeDay <= 1}
              title="Hari Sebelumnya"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Quick Date Select Dropdown */}
            <select
              aria-label="Pilih Tanggal Shif"
              value={activeDay}
              onChange={(e) => setActiveDay(Number(e.target.value))}
              className="bg-white dark:bg-slate-800 border-0 rounded px-2 py-1 text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer focus:ring-1 focus:ring-blue-500"
            >
              {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Tgl {d}
                </option>
              ))}
            </select>

            <button
              onClick={() => setActiveDay(Math.min(schedule.totalDays, activeDay + 1))}
              disabled={activeDay >= schedule.totalDays}
              title="Hari Berikutnya"
              className="p-1.5 rounded hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-2.5 py-1 rounded-lg">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
            <div className="text-xs">
              <span className="font-bold text-blue-950 dark:text-blue-200">
                {dayName}, {activeDay} {monthName} {schedule.year}
              </span>
              <span className="text-[10px] text-blue-700 dark:text-blue-300 block">
                (Hari ke-{activeDay} dari {schedule.totalDays} hari)
              </span>
            </div>
          </div>
        </div>

        {/* Operation Mode Selector */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/80 text-xs w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveMode('swap')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'swap'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <ArrowLeftRight className="w-3.5 h-3.5" />
            <span>Tukar Shif (2 Petugas)</span>
          </button>

          <button
            onClick={() => setActiveMode('override')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'override'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Ganti Shif Tunggal</span>
          </button>

          <button
            onClick={() => setActiveMode('cross_day')}
            className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeMode === 'cross_day'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Tukar Beda Tanggal</span>
          </button>
        </div>
      </div>

      {/* Panel Penugasan Pos Shif Pagi (UKS SD / SMP / SMA / Mobile) Khusus Tanggal Aktif */}
      <div className="bg-gradient-to-br from-sky-50 to-blue-50/70 dark:from-slate-800 dark:to-slate-850 p-4 rounded-xl border-2 border-sky-300 dark:border-sky-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-200 dark:border-sky-800 pb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold shadow-xs">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Penugasan Pos Shif Pagi (UKS SD, UKS SMP, UKS SMA, Mobile)
                </h3>
                <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-black uppercase shadow-2xs">
                  Tgl {activeDay} {monthName}
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400">
                Tetapkan langsung lokasi tugas pos bagi setiap petugas shif pagi (P1, P2, P3) pada tanggal ini. Hasil akan langsung tampil seketika di dashboard Wali Asuh.
              </p>
            </div>
          </div>
        </div>

        {morningStaffOnActiveDay.length === 0 ? (
          <div className="p-4 rounded-lg bg-white/70 dark:bg-slate-900/60 border border-dashed border-sky-300 dark:border-sky-800 text-center text-xs text-slate-500 dark:text-slate-400">
            Tidak ada petugas yang bertugas shif pagi (P1, P2, P3) pada tanggal {activeDay} {monthName}.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {morningStaffOnActiveDay.map((st) => {
              const rawShift = schedule.days[activeDay]?.[st.id] || 'P1';
              const shiftCode = (rawShift === 'P' ? 'P1' : rawShift) as 'P1' | 'P2' | 'P3';
              const currentAssign = morningPostAssignments[`${activeDay}_${st.id}`];
              const assignedTitle = currentAssign?.postTitle;

              return (
                <div
                  key={st.id}
                  className="p-3.5 rounded-xl bg-white dark:bg-slate-900/90 border border-sky-200 dark:border-sky-800/80 shadow-xs space-y-2.5 transition-all hover:border-sky-400 dark:hover:border-sky-600"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                        {st.code || st.id}
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          {st.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {st.gender === 'L' ? 'Ikhwan' : 'Akhwat'} {st.jenjang ? `• ${st.jenjang}` : ''}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {renderShiftBadge(shiftCode, 'sm')}
                    </div>
                  </div>

                  {/* Status Banner */}
                  <div className="flex items-center justify-between text-xs px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">Pos Saat Ini:</span>
                    <div className="flex items-center gap-1.5">
                      {assignedTitle ? (
                        <span className="px-2.5 py-0.5 rounded font-black text-xs bg-sky-600 text-white shadow-2xs flex items-center gap-1">
                          <Check className="w-3 h-3" /> {assignedTitle}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded font-medium text-[11px] bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 italic">
                          Belum Ditugaskan (Standar: UKS / Mobile)
                        </span>
                      )}
                      {assignedTitle && (
                        <button
                          type="button"
                          onClick={() => handleClearMorningPost(st)}
                          title="Hapus / Reset Penugasan Pos"
                          className="p-1 rounded text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/60 cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Quick Select Buttons */}
                  <div className="space-y-1">
                    <div className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex items-center justify-between">
                      <span>Pilih Pos Penugasan:</span>
                      {assignedTitle && <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓ Aktif</span>}
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {morningPostOptions.map((opt) => {
                        const isSelected = assignedTitle === opt.label;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => handleAssignMorningPost(st, shiftCode, opt.label)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold text-left transition-all border cursor-pointer flex items-center justify-between ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-600 ring-2 ring-sky-300 dark:ring-sky-700 shadow-xs'
                                : 'bg-slate-50 dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                            }`}
                          >
                            <span className="truncate">{opt.label}</span>
                            {isSelected && <Check className="w-3 h-3 text-white shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Trigger Modal */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={() => setMorningPostModalTarget({ day: activeDay, staff: st, shiftCode })}
                      className="w-full py-1 px-2 rounded-lg text-[10.5px] font-semibold text-sky-700 dark:text-sky-300 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/50 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 flex items-center justify-center gap-1 cursor-pointer transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Pengaturan Lengkap / Opsi Kustom...</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Execution Workspace Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Left Side: Form Controls (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          {/* MODE 1: SWAP SHIFT (2 STAFF SAME DAY) */}
          {activeMode === 'swap' && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Pilih Dua Petugas yang Akan Ditukar Shifnya
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tanggal: <strong>{activeDay} {monthName}</strong>
                </span>
              </div>

              {/* Two Staff Selection Cards with Swap Visual */}
              <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                {/* Staff 1 Card (5 cols) */}
                <div className="sm:col-span-5 bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      👤 Petugas Pertama (A)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {staff1Obj?.code ? `[${staff1Obj.code}]` : ''} {staff1Obj?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>

                  <select
                    aria-label="Pilih Petugas Pertama"
                    value={staff1Id}
                    onChange={(e) => setStaff1Id(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.code ? `[${st.code}] ` : ''}{st.name} ({getStaffShiftOnDay(st.id, activeDay)})
                      </option>
                    ))}
                  </select>

                  {/* Staff 1 Current Shift Box */}
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                      Shif Saat Ini pada Tgl {activeDay}:
                    </div>
                    <div className="flex items-center justify-between">
                      {renderShiftBadge(staff1CurrentShift, 'md')}
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium">
                        {SHIFT_DEFINITIONS[staff1CurrentShift]?.name || staff1CurrentShift}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Swap Icon Center (1 col) */}
                <div className="sm:col-span-1 flex justify-center py-1 sm:py-0">
                  <button
                    onClick={() => {
                      const temp = staff1Id;
                      setStaff1Id(staff2Id);
                      setStaff2Id(temp);
                      soundManager.playBell();
                    }}
                    title="Tukar Posisi Petugas A dan B"
                    className="w-8 h-8 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/60 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300 flex items-center justify-center transition-transform hover:scale-110 active:rotate-180 duration-200 shadow-xs cursor-pointer"
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Staff 2 Card (5 cols) */}
                <div className="sm:col-span-5 bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">
                      👤 Petugas Kedua (B)
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {staff2Obj?.code ? `[${staff2Obj.code}]` : ''} {staff2Obj?.gender === 'L' ? 'Laki-laki' : 'Perempuan'}
                    </span>
                  </div>

                  <select
                    aria-label="Pilih Petugas Kedua"
                    value={staff2Id}
                    onChange={(e) => setStaff2Id(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.code ? `[${st.code}] ` : ''}{st.name} ({getStaffShiftOnDay(st.id, activeDay)})
                      </option>
                    ))}
                  </select>

                  {/* Staff 2 Current Shift Box */}
                  <div className="bg-white dark:bg-slate-800 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 space-y-1">
                    <div className="text-[10.5px] text-slate-500 dark:text-slate-400 font-medium">
                      Shif Saat Ini pada Tgl {activeDay}:
                    </div>
                    <div className="flex items-center justify-between">
                      {renderShiftBadge(staff2CurrentShift, 'md')}
                      <span className="text-[10.5px] text-slate-600 dark:text-slate-300 font-medium">
                        {SHIFT_DEFINITIONS[staff2CurrentShift]?.name || staff2CurrentShift}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Box (Before vs After) */}
              <div className="bg-gradient-to-r from-blue-50/80 via-slate-50 to-indigo-50/80 dark:from-blue-950/30 dark:via-slate-900/60 dark:to-indigo-950/30 p-3 rounded-xl border border-blue-200/80 dark:border-blue-900/50 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-950 dark:text-blue-200">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                  <span>Pratinjau Hasil Penukaran Shif:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {staff1Obj?.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {staff1CurrentShift} ➡️ <strong className="text-blue-600 dark:text-blue-400">{staff2CurrentShift}</strong>
                      </div>
                    </div>
                    <div>{renderShiftBadge(staff2CurrentShift, 'md')}</div>
                  </div>

                  <div className="bg-white dark:bg-slate-800/90 p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900 dark:text-white truncate max-w-[150px]">
                        {staff2Obj?.name}
                      </div>
                      <div className="text-[10.5px] text-slate-500 dark:text-slate-400">
                        {staff2CurrentShift} ➡️ <strong className="text-indigo-600 dark:text-indigo-400">{staff1CurrentShift}</strong>
                      </div>
                    </div>
                    <div>{renderShiftBadge(staff1CurrentShift, 'md')}</div>
                  </div>
                </div>
              </div>

              {/* Reason / Notes Section */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                  <span>Alasan / Keterangan Penukaran Shif:</span>
                  <span className="text-slate-400 text-[10.5px] font-normal">(Opsional)</span>
                </label>

                {/* Quick Reason Chips */}
                <div className="flex flex-wrap gap-1">
                  {SWAP_REASONS.map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => {
                        setReason(r);
                        setCustomReason('');
                      }}
                      className={`px-2 py-0.5 rounded-md text-[10.5px] transition-all cursor-pointer ${
                        reason === r
                          ? 'bg-blue-600 text-white font-bold shadow-2xs'
                          : 'bg-slate-100 dark:bg-slate-700/60 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <input
                  type="text"
                  placeholder="Atau ketik keterangan khusus lainnya..."
                  value={customReason}
                  onChange={(e) => {
                    setCustomReason(e.target.value);
                    if (e.target.value) setReason('');
                  }}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Isolated Swap Guarantee */}
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-200 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>
                  <strong>Aman & Terisolasi:</strong> Penukaran shif ini hanya menukar jadwal 2 petugas terpilih pada tanggal ini. Jadwal staf lain dan tanggal lainnya 100% aman dan tidak terpengaruh.
                </span>
              </div>

              {/* Action Button */}
              <button
                onClick={handleExecuteSwap}
                disabled={staff1Id === staff2Id || staff1CurrentShift === staff2CurrentShift}
                className="w-full py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:from-slate-400 disabled:to-slate-400 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed cursor-pointer"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Konfirmasi & Eksekusi Tukar Shif</span>
              </button>
            </div>
          )}

          {/* MODE 2: SINGLE SHIFT OVERRIDE */}
          {activeMode === 'override' && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Ganti Shif 1 Petugas Tertentu (Override)
                  </h3>
                </div>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Tanggal: <strong>{activeDay} {monthName}</strong>
                </span>
              </div>

              {/* Select Staff */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Pilih Wali Asuh / Petugas:
                </label>
                <select
                  aria-label="Pilih Petugas untuk Ganti Shift"
                  value={staff1Id}
                  onChange={(e) => setStaff1Id(Number(e.target.value))}
                  className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 cursor-pointer"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.code ? `[${st.code}] ` : ''}{st.name} ({getStaffShiftOnDay(st.id, activeDay)})
                    </option>
                  ))}
                </select>
              </div>

              {/* Current Shift vs New Shift Picker */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Shif Saat Ini:</span>
                  <div>{renderShiftBadge(staff1CurrentShift, 'md')}</div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Pilih Shif Baru yang Ditetapkan:
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
                    {AVAILABLE_SHIFTS.map((code) => {
                      const isSelected = overrideShift === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setOverrideShift(code)}
                          className={`p-2 rounded-lg border text-center font-bold text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-blue-600 text-white border-blue-600 ring-2 ring-blue-300 dark:ring-blue-800 shadow-xs'
                              : 'bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'
                          }`}
                        >
                          <div className="text-xs">{code}</div>
                          <div className="text-[9.5px] opacity-75 font-normal truncate">
                            {SHIFT_DEFINITIONS[code]?.name.replace(` (${code})`, '') || code}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Alasan / Keterangan Penyesuaian:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Izin cuti darurat, perubahan jadwal dinas, dll..."
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Button */}
              <button
                onClick={handleExecuteOverride}
                disabled={staff1CurrentShift === overrideShift}
                className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-400 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99] disabled:cursor-not-allowed cursor-pointer"
              >
                <Sliders className="w-4 h-4" />
                <span>Simpan Perubahan Shif Tunggal</span>
              </button>
            </div>
          )}

          {/* MODE 3: CROSS-DAY SWAP */}
          {activeMode === 'cross_day' && (
            <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 flex items-center justify-center font-bold text-xs">
                    3
                  </span>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tukar Shif Silang Antar Tanggal Berbeda
                  </h3>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Staff 1 on Day 1 */}
                <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="text-[10.5px] font-bold text-blue-700 dark:text-blue-400 uppercase">
                    Petugas A pada Tanggal {activeDay} {monthName}
                  </div>
                  <select
                    aria-label="Pilih Petugas A"
                    value={staff1Id}
                    onChange={(e) => setStaff1Id(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({getStaffShiftOnDay(st.id, activeDay)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Shif Tgl {activeDay}:</span>
                    {renderShiftBadge(staff1CurrentShift, 'sm')}
                  </div>
                </div>

                {/* Staff 2 on Day 2 */}
                <div className="bg-slate-50 dark:bg-slate-900/70 p-3 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <span className="text-[10.5px] font-bold text-indigo-700 dark:text-indigo-400 uppercase">
                      Petugas B pada Tanggal:
                    </span>
                    <select
                      aria-label="Pilih Tanggal Petugas B"
                      value={crossDay2}
                      onChange={(e) => setCrossDay2(Number(e.target.value))}
                      className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-1.5 py-0.5 text-[11px] font-bold text-indigo-900 dark:text-indigo-300"
                    >
                      {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          Tgl {d}
                        </option>
                      ))}
                    </select>
                  </div>
                  <select
                    aria-label="Pilih Petugas B"
                    value={staff2Id}
                    onChange={(e) => setStaff2Id(Number(e.target.value))}
                    className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs font-bold text-slate-900 dark:text-white"
                  >
                    {staffList.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name} ({getStaffShiftOnDay(st.id, crossDay2)})
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between text-xs pt-1">
                    <span className="text-slate-500">Shif Tgl {crossDay2}:</span>
                    {renderShiftBadge(staff2CurrentShift, 'sm')}
                  </div>
                </div>
              </div>

              {/* Action */}
              <button
                onClick={handleExecuteCrossDaySwap}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 text-sm transition-all active:scale-[0.99] cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Konfirmasi Tukar Silang Multi-Hari</span>
              </button>
            </div>
          )}
        </div>

        {/* Right Side: Roster on Selected Day & Quick Selection (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-col h-[520px]">
            {/* Header with Search & Filter */}
            <div className="space-y-2 pb-2.5 border-b border-slate-100 dark:border-slate-700/60 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                    Daftar Piket Tgl {activeDay} {monthName} ({filteredStaffList.length} Petugas)
                  </h3>
                </div>
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Klik untuk pilih
                </span>
              </div>

              {/* Search Bar & Gender Toggle */}
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari nama / kode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[10.5px] shrink-0">
                  <button
                    onClick={() => setGenderFilter('ALL')}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      genderFilter === 'ALL'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    Semua
                  </button>
                  <button
                    onClick={() => setGenderFilter('L')}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      genderFilter === 'L'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    L
                  </button>
                  <button
                    onClick={() => setGenderFilter('P')}
                    className={`px-1.5 py-0.5 rounded font-bold ${
                      genderFilter === 'P'
                        ? 'bg-blue-600 text-white shadow-2xs'
                        : 'text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    P
                  </button>
                </div>
              </div>

              {/* Shift Stats Summary Mini Pills */}
              <div className="flex flex-wrap gap-1 text-[10px] pt-1">
                <span className="px-1.5 py-0.2 bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 rounded border border-sky-300 dark:border-sky-800 font-semibold">
                  Pagi: {dayShiftCounts.P1 + dayShiftCounts.P2} (P1:{dayShiftCounts.P1}, P2:{dayShiftCounts.P2})
                </span>
                {(dayShiftCounts.P5 || 0) > 0 && (
                  <span className="px-1.5 py-0.2 bg-teal-100 dark:bg-teal-950/60 text-teal-800 dark:text-teal-300 rounded border border-teal-300 dark:border-teal-800 font-semibold">
                    P5: {dayShiftCounts.P5} Org
                  </span>
                )}
                <span className="px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 rounded border border-emerald-300 dark:border-emerald-800 font-semibold">
                  Sore: {dayShiftCounts.S2A + dayShiftCounts.S3A + dayShiftCounts.S4A} (S2A:{dayShiftCounts.S2A}, S3A:{dayShiftCounts.S3A}, S4A:{dayShiftCounts.S4A})
                </span>
                <span className="px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-800 dark:text-indigo-300 rounded border border-indigo-300 dark:border-indigo-800 font-semibold">
                  Malam: {dayShiftCounts.M}
                </span>
                <span className="px-1.5 py-0.2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded border border-slate-300 dark:border-slate-700">
                  Off/Cuti: {dayShiftCounts.O + dayShiftCounts.LP + dayShiftCounts.C}
                </span>
              </div>
            </div>

            {/* Scrollable Staff List */}
            <div className="flex-1 overflow-y-auto space-y-1 pr-1 pt-2 scrollbar-thin">
              {filteredStaffList.map((st) => {
                const shift = getStaffShiftOnDay(st.id, activeDay);
                const isSelectedAs1 = staff1Id === st.id;
                const isSelectedAs2 = staff2Id === st.id;

                return (
                  <div
                    key={st.id}
                    className={`flex items-center justify-between p-2 rounded-lg border text-xs transition-all ${
                      isSelectedAs1
                        ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 dark:border-blue-700 ring-1 ring-blue-400'
                        : isSelectedAs2
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 border-indigo-400 dark:border-indigo-700 ring-1 ring-indigo-400'
                        : 'bg-slate-50/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-700/60 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="w-5 h-5 rounded-full bg-slate-200 dark:bg-slate-700 text-[10px] font-bold flex items-center justify-center text-slate-700 dark:text-slate-300 shrink-0">
                        {st.code || st.id}
                      </span>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 dark:text-white truncate">
                          {st.name}
                        </div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          <span>{st.gender === 'L' ? 'Ikhwan' : 'Akhwat'}</span>
                          {st.jenjang && <span>• {st.jenjang}</span>}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderShiftBadge(shift, 'sm')}
                      {(shift === 'P1' || shift === 'P2' || shift === 'P3' || shift === 'P') && (
                        <button
                          type="button"
                          onClick={() => setMorningPostModalTarget({ 
                            day: activeDay, 
                            staff: st, 
                            shiftCode: (shift === 'P' ? 'P1' : shift) as 'P1' | 'P2' | 'P3' 
                          })}
                          className={`text-[9px] px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                            morningPostAssignments[`${activeDay}_${st.id}`]?.postTitle
                              ? 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-300 dark:border-sky-800'
                              : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800 border-dashed hover:bg-amber-100'
                          }`}
                          title="Klik untuk atur pos penugasan"
                        >
                          {morningPostAssignments[`${activeDay}_${st.id}`]?.postTitle || '+ Pos'}
                        </button>
                      )}

                      {/* Quick Select Buttons */}
                      <div className="flex items-center gap-0.5">
                        <button
                          onClick={() => {
                            setStaff1Id(st.id);
                            soundManager.playBell();
                          }}
                          title="Pilih sebagai Petugas 1 (A)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            isSelectedAs1
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 hover:bg-blue-50'
                          }`}
                        >
                          A
                        </button>
                        <button
                          onClick={() => {
                            setStaff2Id(st.id);
                            soundManager.playBell();
                          }}
                          title="Pilih sebagai Petugas 2 (B)"
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                            isSelectedAs2
                              ? 'bg-indigo-600 text-white border-indigo-600'
                              : 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50'
                          }`}
                        >
                          B
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Section: Swap History Logs & Audit Trail */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-2.5">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              Riwayat Penukaran & Perubahan Shif ({swapLogs.length} Catatan)
            </h3>
          </div>

          <div className="flex items-center gap-2">
            {swapLogs.length > 0 && (
              <button
                onClick={handleClearLogs}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 font-semibold flex items-center gap-1 px-2 py-1 rounded-md hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Riwayat</span>
              </button>
            )}
          </div>
        </div>

        {swapLogs.length === 0 ? (
          <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs space-y-1">
            <History className="w-8 h-8 mx-auto opacity-40 mb-1" />
            <p>Belum ada riwayat penukaran shif yang dilakukan untuk bulan ini.</p>
            <p className="text-[11px] text-slate-400">Setiap aksi penukaran akan tercatat di sini dan dapat dibatalkan (Undo) sewaktu-waktu.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
            {swapLogs.map((log) => (
              <div
                key={log.id}
                className={`p-3 rounded-xl border text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 transition-all ${
                  log.undone
                    ? 'bg-slate-100 dark:bg-slate-900/40 border-slate-300 dark:border-slate-800 opacity-60'
                    : 'bg-slate-50 dark:bg-slate-900/70 border-slate-200 dark:border-slate-700'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                        log.type === 'swap'
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300'
                          : log.type === 'override'
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300'
                          : 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300'
                      }`}
                    >
                      {log.type === 'swap' ? 'Tukar Shif' : log.type === 'override' ? 'Ganti Shif' : 'Tukar Silang'}
                    </span>

                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      Tgl {log.day1} {monthName} {log.year}
                      {log.day2 && ` ⇄ Tgl ${log.day2} ${monthName}`}
                    </span>

                    <span className="text-[10px] text-slate-400">• {log.timestamp}</span>

                    {log.undone && (
                      <span className="px-1.5 py-0.2 bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 rounded text-[9.5px] font-bold">
                        DIBATALKAN (UNDONE)
                      </span>
                    )}
                  </div>

                  {/* Change Details */}
                  <div className="text-slate-700 dark:text-slate-300 flex items-center gap-2 flex-wrap">
                    <span>
                      <strong>{log.staff1Name}</strong>: {log.staff1OldShift} ➡️ <strong>{log.staff1NewShift}</strong>
                    </span>
                    {log.staff2Name && (
                      <>
                        <span>•</span>
                        <span>
                          <strong>{log.staff2Name}</strong>: {log.staff2OldShift} ➡️ <strong>{log.staff2NewShift}</strong>
                        </span>
                      </>
                    )}
                  </div>

                  {/* Reason */}
                  {log.reason && (
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                      Alasan: "{log.reason}"
                    </div>
                  )}
                </div>

                {/* Undo Button */}
                {!log.undone && (
                  <button
                    onClick={() => handleUndoLog(log)}
                    title="Batalkan penukaran ini dan kembalikan jadwal awal"
                    className="shrink-0 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 text-slate-700 dark:text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors shadow-2xs cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Batalkan (Undo)</span>
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Morning Post Assignment Modal */}
      {morningPostModalTarget && (
        <MorningPostAssignmentModal
          isOpen={!!morningPostModalTarget}
          onClose={() => setMorningPostModalTarget(null)}
          staff={morningPostModalTarget.staff}
          day={morningPostModalTarget.day}
          month={schedule.month}
          year={schedule.year}
          monthName={schedule.monthName}
          shiftCode={morningPostModalTarget.shiftCode}
          userRole="admin"
          onSaved={(assignment) => {
            setMorningPostAssignments(getLocalMorningPostAssignments(schedule.year, schedule.month));
            setToastMessage({
              type: 'success',
              text: assignment 
                ? `Pos untuk ${morningPostModalTarget.staff.name} berhasil disimpan: "${assignment.postTitle}"`
                : `Pos untuk ${morningPostModalTarget.staff.name} direset.`
            });
            setTimeout(() => setToastMessage(null), 3500);
          }}
        />
      )}
    </div>
  );
};
