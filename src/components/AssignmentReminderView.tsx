import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Send, 
  Copy, 
  Check, 
  RotateCcw, 
  Printer, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Building, 
  Utensils, 
  GraduationCap, 
  Moon, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUpDown,
  Clock,
  Sparkles,
  ExternalLink,
  MessageCircle,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  Sun,
  MapPin
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode, MorningPostAssignment } from '../types';
import { INDONESIAN_DAY_NAMES, INDONESIAN_MONTH_NAMES } from '../utils/scheduler';
import { soundManager } from '../utils/audio';
import { 
  getLocalMorningPostAssignments, 
  subscribeToMorningPostAssignments, 
  saveMorningPostAssignmentToSupabase, 
  deleteMorningPostAssignment,
  clearStaffMainPost,
  getLocalMorningPostOptions
} from '../utils/morningPostService';

export type PosCategory = 'masjid' | 'kantin_smp' | 'kantin_sma' | 'mobile';

export interface PosStaffItem {
  id: string; // unique assignment id
  staffId: number;
  name: string;
  shiftCode: ShiftCode;
  customName?: string;
}

export interface AssignmentReminderViewProps {
  schedule: MonthSchedule;
  staffList: Staff[];
  selectedStaffId: number;
  activeDay: number;
  setActiveDay: (day: number) => void;
  onNavigateToTab?: (tab: string) => void;
}

const POS_CONFIG: Record<PosCategory, {
  id: PosCategory;
  title: string;
  codeTag: string;
  icon: React.ComponentType<{ className?: string }>;
  accentColor: string;
  badgeBg: string;
  lightBg: string;
  darkBg: string;
  borderColor: string;
  desc: string;
}> = {
  masjid: {
    id: 'masjid',
    title: 'Pos Masjid',
    codeTag: 'S4A',
    icon: Building,
    accentColor: 'emerald',
    badgeBg: 'bg-emerald-600 text-white',
    lightBg: 'bg-emerald-50/70 dark:bg-emerald-950/20',
    darkBg: 'border-emerald-200 dark:border-emerald-800/60',
    borderColor: 'border-emerald-200 dark:border-emerald-800',
    desc: 'Pengawalan sholat, ibadah, & pembinaan asrama masjid'
  },
  kantin_smp: {
    id: 'kantin_smp',
    title: 'Pos Kantin SMP',
    codeTag: 'S2A',
    icon: Utensils,
    accentColor: 'blue',
    badgeBg: 'bg-blue-600 text-white',
    lightBg: 'bg-blue-50/70 dark:bg-blue-950/20',
    darkBg: 'border-blue-200 dark:border-blue-800/60',
    borderColor: 'border-blue-200 dark:border-blue-800',
    desc: 'Piket makan malam & ketertiban area kantin SMP'
  },
  kantin_sma: {
    id: 'kantin_sma',
    title: 'Pos Kantin SMA',
    codeTag: 'S3A',
    icon: GraduationCap,
    accentColor: 'amber',
    badgeBg: 'bg-amber-600 text-white',
    lightBg: 'bg-amber-50/70 dark:bg-amber-950/20',
    darkBg: 'border-amber-200 dark:border-amber-800/60',
    borderColor: 'border-amber-200 dark:border-amber-800',
    desc: 'Piket makan malam & pendampingan santri di SMA'
  },
  mobile: {
    id: 'mobile',
    title: 'Mobile (Jaga Malam)',
    codeTag: 'M1, M2, M3',
    icon: Moon,
    accentColor: 'purple',
    badgeBg: 'bg-purple-600 text-white',
    lightBg: 'bg-purple-50/70 dark:bg-purple-950/20',
    darkBg: 'border-purple-200 dark:border-purple-800/60',
    borderColor: 'border-purple-200 dark:border-purple-800',
    desc: 'Patroli keliling, keamanan malam hari & persiapan subuh'
  }
};

export const AssignmentReminderView: React.FC<AssignmentReminderViewProps> = ({
  schedule,
  staffList,
  selectedStaffId,
  activeDay,
  setActiveDay,
  onNavigateToTab
}) => {
  // Day range validation
  const safeDay = Math.min(Math.max(1, activeDay), schedule.totalDays || 30);

  // Time and message options
  const [timeRange, setTimeRange] = useState<string>('15.00 s.d. 22.00');
  const [headerPrefix, setHeaderPrefix] = useState<string>(
    'izin share untuk pembagian pos tugas hari ini nggih'
  );
  const [footerNote, setFooterNote] = useState<string>('Mohon ditindaklanjuti');
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Morning post assignments state & options
  const [morningPostAssignments, setMorningPostAssignments] = useState<Record<string, MorningPostAssignment>>(() =>
    getLocalMorningPostAssignments(schedule.year, schedule.month)
  );
  const [includeMorningInShare, setIncludeMorningInShare] = useState<boolean>(true);
  const morningOptions = useMemo(() => getLocalMorningPostOptions(), []);

  useEffect(() => {
    const unsub = subscribeToMorningPostAssignments(schedule.year, schedule.month, (data) => {
      setMorningPostAssignments(data);
    });
    return () => unsub();
  }, [schedule.year, schedule.month]);

  // Editing modal/state for adding staff manually or renaming
  const [showAddStaffModal, setShowAddStaffModal] = useState<PosCategory | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState<string>('');

  // Storage key for custom assignments
  const storageKey = `wali_asuh_pos_v1_${schedule.year}_${schedule.month}_${safeDay}`;

  // Date calculation
  const dateObj = useMemo(() => {
    return new Date(schedule.year, schedule.month - 1, safeDay);
  }, [schedule.year, schedule.month, safeDay]);

  const dayName = INDONESIAN_DAY_NAMES[dateObj.getDay()];
  const monthName = (schedule.monthName || INDONESIAN_MONTH_NAMES[schedule.month - 1] || '').toLowerCase();
  const dayStr = String(safeDay).padStart(2, '0');
  const formattedDateTitle = `${dayName}, ${dayStr} ${schedule.monthName || INDONESIAN_MONTH_NAMES[schedule.month - 1]} ${schedule.year}`;

  // Extract all morning staff for safeDay (P1, P2, P3, P)
  const morningStaffList = useMemo(() => {
    const dayShifts = schedule.days[safeDay] || {};
    const staffMap = new Map<number, Staff>(staffList.map((s) => [s.id, s]));
    const list: { staff: Staff; shift: ShiftCode; postTitle?: string; optionId?: string; quranAssistance?: string }[] = [];

    for (const [sIdStr, rawShift] of Object.entries(dayShifts)) {
      const staffId = Number(sIdStr);
      const staff = staffMap.get(staffId);
      if (!staff) continue;
      const shift = rawShift as ShiftCode;
      if (['P', 'P1', 'P2', 'P3'].includes(shift as string)) {
        const item = morningPostAssignments[`${safeDay}_${staff.id}`];
        list.push({ 
          staff, 
          shift, 
          postTitle: item?.postTitle,
          optionId: item?.optionId,
          quranAssistance: item?.quranAssistance
        });
      }
    }
    return list;
  }, [schedule.days, safeDay, staffList, morningPostAssignments]);

  const handleAssignMorningPost = async (staff: Staff, optionLabel: string, optionId: string) => {
    const existing = morningPostAssignments[`${safeDay}_${staff.id}`];
    const assignment: MorningPostAssignment = {
      year: schedule.year,
      month: schedule.month,
      day: safeDay,
      staffId: staff.id,
      staffName: staff.name,
      shiftCode: existing?.shiftCode,
      postTitle: optionLabel,
      optionId: optionId,
      quranAssistance: existing?.quranAssistance,
      assignedBy: 'Pengingat Penugasan'
    };
    setMorningPostAssignments(prev => ({
      ...prev,
      [`${safeDay}_${staff.id}`]: assignment
    }));
    await saveMorningPostAssignmentToSupabase(assignment);
    soundManager.playChime();
    setToastMsg(`Penugasan ${staff.name} ke ${optionLabel} berhasil disimpan!`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  const handleClearMorningPost = async (staff: Staff) => {
    const existing = morningPostAssignments[`${safeDay}_${staff.id}`];
    if (existing?.quranAssistance) {
      const updated = { ...existing };
      delete updated.postTitle;
      delete updated.optionId;
      setMorningPostAssignments(prev => ({
        ...prev,
        [`${safeDay}_${staff.id}`]: updated
      }));
      await clearStaffMainPost(schedule.year, schedule.month, safeDay, staff.id);
    } else {
      setMorningPostAssignments(prev => {
        const next = { ...prev };
        delete next[`${safeDay}_${staff.id}`];
        return next;
      });
      await deleteMorningPostAssignment(schedule.year, schedule.month, safeDay, staff.id);
    }
    soundManager.playClick();
    setToastMsg(`Penugasan pos khusus untuk ${staff.name} telah direset.`);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Helper to build initial automatic pos assignment from schedule
  const getAutoAssignments = useCallback((): Record<PosCategory, PosStaffItem[]> => {
    const dayShifts = schedule.days[safeDay] || {};
    const staffMap = new Map<number, Staff>(staffList.map((s) => [s.id, s]));

    const soreStaff: { staff: Staff; shift: ShiftCode }[] = [];
    const malamStaff: { staff: Staff; shift: ShiftCode }[] = [];

    for (const [sIdStr, rawShift] of Object.entries(dayShifts)) {
      const staffId = Number(sIdStr);
      const staff = staffMap.get(staffId);
      if (!staff) continue;

      const shift = rawShift as ShiftCode;
      if (['S', 'S2A', 'S3A', 'S4A'].includes(shift as string)) {
        soreStaff.push({ staff, shift });
      } else if (['M', 'M1', 'M2', 'M3'].includes(shift as string)) {
        malamStaff.push({ staff, shift });
      }
    }

    const posRes: Record<PosCategory, PosStaffItem[]> = {
      masjid: [],
      kantin_smp: [],
      kantin_sma: [],
      mobile: []
    };

    // 1. Mobile (Malam): All M, M1, M2 staff
    malamStaff.forEach(({ staff, shift }, idx) => {
      posRes.mobile.push({
        id: `auto-m-${staff.id}-${idx}`,
        staffId: staff.id,
        name: staff.name,
        shiftCode: shift
      });
    });

    // 2. Sore staff:
    // S4A goes to masjid
    // S2A goes to kantin_smp
    // S3A split between kantin_smp and kantin_sma
    const unallocatedSore: { staff: Staff; shift: ShiftCode }[] = [];

    soreStaff.forEach((item) => {
      if (item.shift === 'S4A') {
        posRes.masjid.push({
          id: `auto-s4a-${item.staff.id}`,
          staffId: item.staff.id,
          name: item.staff.name,
          shiftCode: item.shift
        });
      } else if (item.shift === 'S2A') {
        posRes.kantin_smp.push({
          id: `auto-s2a-${item.staff.id}`,
          staffId: item.staff.id,
          name: item.staff.name,
          shiftCode: item.shift
        });
      } else {
        unallocatedSore.push(item);
      }
    });

    // Distribute remaining S3A or generic S
    unallocatedSore.forEach((item) => {
      const sName = (item.staff.name || '').toLowerCase();
      const jenjang = (item.staff.jenjang || '').toUpperCase();

      // If jenjang is SMP or name hints SMP
      if (jenjang === 'SMP' || sName.includes('hiras') || sName.includes('yusak')) {
        if (posRes.kantin_smp.length < 3) {
          posRes.kantin_smp.push({
            id: `auto-s3a-smp-${item.staff.id}`,
            staffId: item.staff.id,
            name: item.staff.name,
            shiftCode: item.shift
          });
          return;
        }
      }

      // If kantin_smp is still less than 2
      if (posRes.kantin_smp.length < 2) {
        posRes.kantin_smp.push({
          id: `auto-s3a-smp-${item.staff.id}`,
          staffId: item.staff.id,
          name: item.staff.name,
          shiftCode: item.shift
        });
      } else if (posRes.kantin_sma.length < 3) {
        posRes.kantin_sma.push({
          id: `auto-s3a-sma-${item.staff.id}`,
          staffId: item.staff.id,
          name: item.staff.name,
          shiftCode: item.shift
        });
      } else {
        // Additional sore goes to masjid or SMA
        posRes.masjid.push({
          id: `auto-s-masjid-${item.staff.id}`,
          staffId: item.staff.id,
          name: item.staff.name,
          shiftCode: item.shift
        });
      }
    });

    return posRes;
  }, [schedule.days, safeDay, staffList]);

  // Current pos assignments state (with localStorage caching)
  const [posData, setPosData] = useState<Record<PosCategory, PosStaffItem[]>>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.masjid && parsed.kantin_smp) {
          return parsed;
        }
      }
    } catch {}
    return getAutoAssignments();
  });

  // Re-sync when safeDay or schedule changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && parsed.masjid && parsed.kantin_smp) {
          setPosData(parsed);
          return;
        }
      }
    } catch {}
    setPosData(getAutoAssignments());
  }, [storageKey, getAutoAssignments]);

  // Save changes to localStorage
  const updateAndPersistPosData = (newData: Record<PosCategory, PosStaffItem[]>) => {
    setPosData(newData);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newData));
    } catch (e) {
      console.warn('Failed to persist pos data:', e);
    }
  };

  // Move a staff member between Pos categories
  const handleMoveStaff = (itemId: string, fromPos: PosCategory, toPos: PosCategory) => {
    if (fromPos === toPos) return;

    const sourceList = [...posData[fromPos]];
    const itemIndex = sourceList.findIndex((it) => it.id === itemId);
    if (itemIndex === -1) return;

    const [itemToMove] = sourceList.splice(itemIndex, 1);
    const targetList = [...posData[toPos], itemToMove];

    const updated = {
      ...posData,
      [fromPos]: sourceList,
      [toPos]: targetList
    };

    updateAndPersistPosData(updated);
    soundManager.playClick();
  };

  // Move staff up/down within a pos list
  const handleReorderStaff = (pos: PosCategory, index: number, direction: 'up' | 'down') => {
    const list = [...posData[pos]];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    updateAndPersistPosData({
      ...posData,
      [pos]: list
    });
  };

  // Remove staff from pos
  const handleRemoveStaff = (pos: PosCategory, itemId: string) => {
    const list = posData[pos].filter((it) => it.id !== itemId);
    updateAndPersistPosData({
      ...posData,
      [pos]: list
    });
    soundManager.playClick();
  };

  // Add staff to pos
  const handleAddStaffToPos = (pos: PosCategory, staff: Staff) => {
    const dayShifts = schedule.days[safeDay] || {};
    const currentShift = dayShifts[staff.id] || (pos === 'mobile' ? 'M1' : pos === 'masjid' ? 'S4A' : pos === 'kantin_smp' ? 'S2A' : 'S3A');

    const newItem: PosStaffItem = {
      id: `manual-${staff.id}-${Date.now()}`,
      staffId: staff.id,
      name: staff.name,
      shiftCode: currentShift as ShiftCode
    };

    updateAndPersistPosData({
      ...posData,
      [pos]: [...posData[pos], newItem]
    });

    setShowAddStaffModal(null);
    soundManager.playClick();
    showToast(`${staff.name} ditambahkan ke ${POS_CONFIG[pos].title}`);
  };

  // Inline rename / custom label handler
  const handleSaveRename = (pos: PosCategory, itemId: string) => {
    if (!editNameValue.trim()) {
      setEditingItemId(null);
      return;
    }

    const list = posData[pos].map((it) => {
      if (it.id === itemId) {
        return { ...it, customName: editNameValue.trim() };
      }
      return it;
    });

    updateAndPersistPosData({
      ...posData,
      [pos]: list
    });
    setEditingItemId(null);
  };

  // Reset to default schedule assignments
  const handleResetToAuto = () => {
    const auto = getAutoAssignments();
    updateAndPersistPosData(auto);
    try {
      localStorage.removeItem(storageKey);
    } catch {}
    soundManager.playChime();
    showToast('Pos penugasan dikembalikan ke penempatan otomatis jadwal.');
  };

  // Toast notification helper
  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
  };

  // Build the clean WhatsApp message string
  const generateWhatsAppMessage = useCallback((): string => {
    const lines: string[] = [];

    // Header Line
    lines.push(
      `${headerPrefix} tanggal ${dayStr} ${monthName} ${schedule.year} (${timeRange})`
    );
    lines.push('');

    // Pos Tugas Shif Pagi (P1, P2, P3: UKS SD / SMP / SMA / Mobile)
    if (includeMorningInShare && morningStaffList.length > 0) {
      lines.push('pos tugas shif pagi ( P1, P2, P3 ) :');
      morningStaffList.forEach((item, idx) => {
        const postLabel = item.postTitle || (item.shift === 'P1' ? 'UKS SD / UKS SMP (Standar)' : item.shift === 'P2' ? 'Mobile / Keliling' : 'Jaga Pagi Standar');
        const quranSuffix = item.quranAssistance ? ` • 📖 ${item.quranAssistance}` : '';
        lines.push(`${idx + 1}. ${item.staff.name} (${item.shift}) : ${postLabel}${quranSuffix}`);
      });
      lines.push('');
    }

    // Pos Masjid (S4A)
    lines.push('pos masjid ( S4A) :');
    if (posData.masjid.length === 0) {
      lines.push('- Belum ada petugas');
    } else {
      posData.masjid.forEach((item, idx) => {
        const displayName = item.customName || item.name;
        lines.push(`${idx + 1}. ${displayName}`);
      });
    }

    // Pos Kantin SMP (S2A)
    lines.push('pos kantin smp ( S2A ):');
    if (posData.kantin_smp.length === 0) {
      lines.push('- Belum ada petugas');
    } else {
      posData.kantin_smp.forEach((item, idx) => {
        const displayName = item.customName || item.name;
        lines.push(`${idx + 1}. ${displayName}`);
      });
    }

    // Pos Kantin SMA (S3A)
    lines.push('pos kantin sma ( S3A) :');
    if (posData.kantin_sma.length === 0) {
      lines.push('- Belum ada petugas');
    } else {
      posData.kantin_sma.forEach((item, idx) => {
        const displayName = item.customName || item.name;
        lines.push(`${idx + 1}. ${displayName}`);
      });
    }

    // Mobile (Jaga Malam) (M1, M2, M3)
    lines.push('mobile (jaga malam) ( M1 ,M2 ,M3 )');
    let hasM3 = false;
    if (posData.mobile.length === 0) {
      lines.push('- Belum ada petugas');
    } else {
      posData.mobile.forEach((item, idx) => {
        const displayName = item.customName || item.name;
        if (item.shiftCode === 'M3') {
          hasM3 = true;
          lines.push(`${idx + 1}. ${displayName} (M3 - Patroli Keliling Asrama 23:00 WIB & Kirim Foto Grup)`);
        } else {
          lines.push(`${idx + 1}. ${displayName}`);
        }
      });
    }

    if (hasM3) {
      lines.push('');
      lines.push('📌 *CATATAN KHUSUS SHIF M3 (23:00 - 07:00):*');
      lines.push('- Hadir pukul 23:00 WIB wajib keliling asrama santri & lingkungan sekitar serta kirim foto ke grup dinas');
      lines.push('- Mendampingi penuh shif malam, mulai pukul 03:00 WIB menjalankan SOP kode M2 (subuh & bangun pagi santri)');
    }

    lines.push('');
    lines.push(footerNote);

    return lines.join('\n');
  }, [headerPrefix, dayStr, monthName, schedule.year, timeRange, posData, footerNote, includeMorningInShare, morningStaffList]);

  const waMessage = useMemo(() => generateWhatsAppMessage(), [generateWhatsAppMessage]);

  // Copy to clipboard
  const handleCopyWhatsApp = async () => {
    try {
      await navigator.clipboard.writeText(waMessage);
      setCopied(true);
      soundManager.playBell();
      showToast('Teks penugasan berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Clipboard copy failed, fallback to textarea:', err);
      const textArea = document.createElement('textarea');
      textArea.value = waMessage;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      showToast('Teks penugasan berhasil disalin!');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  // Open direct WhatsApp web/app
  const handleShareToWhatsApp = () => {
    const encoded = encodeURIComponent(waMessage);
    const waUrl = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(waUrl, '_blank', 'noopener,noreferrer');
  };

  // Stats calculation
  const totalMasjid = posData.masjid.length;
  const totalKantinSMP = posData.kantin_smp.length;
  const totalKantinSMA = posData.kantin_sma.length;
  const totalMobile = posData.mobile.length;
  const totalAssigned = totalMasjid + totalKantinSMP + totalKantinSMA + totalMobile;

  // Real today dates
  const realNow = new Date();
  const isSelectedDayRealToday =
    realNow.getDate() === safeDay &&
    realNow.getMonth() + 1 === schedule.month &&
    realNow.getFullYear() === schedule.year;

  return (
    <div className="space-y-1 sm:space-y-1.5 pb-3 max-w-[1600px] mx-auto">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed bottom-3 right-3 z-50 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner & Control Bar - Rapat & Elegan */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-slate-800 text-white rounded-lg px-2 py-1.5 sm:px-2.5 sm:py-2 shadow-xs border border-emerald-600/30">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-1 sm:gap-1.5">
          {/* Title and description */}
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-md bg-white/15 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner border border-white/20">
              <Send className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-[13px] font-bold tracking-tight leading-tight">
                  Pengingat Penugasan Shif Sore & Malam
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[8.5px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-400/40 leading-none">
                  Format WA Otomatis
                </span>
                {isSelectedDayRealToday && (
                  <span className="px-1.5 py-0.2 rounded-full text-[8.5px] font-extrabold bg-amber-400 text-amber-950 animate-pulse leading-none">
                    ● HARI INI
                  </span>
                )}
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-emerald-100/90 leading-none mt-0.5">
                Pos Masjid (S4A), Kantin SMP (S2A), Kantin SMA (S3A), dan Mobile Jaga Malam (M1, M2, M3)
              </p>
            </div>
          </div>

          {/* Date Selector & Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-1">
            {/* Quick Day Switcher */}
            <div className="flex items-center bg-black/25 backdrop-blur-md rounded-md p-0.5 border border-white/15">
              <button
                type="button"
                onClick={() => setActiveDay(Math.max(1, safeDay - 1))}
                disabled={safeDay <= 1}
                title="Hari Sebelumnya"
                className="p-0.5 rounded hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white"
              >
                <ChevronLeft className="w-3 h-3" />
              </button>

              <div className="px-1.5 py-0 text-center min-w-[115px] sm:min-w-[130px]">
                <div className="text-[8.5px] text-emerald-200 font-medium leading-none">
                  {dayName}
                </div>
                <div className="text-[10.5px] sm:text-[11px] font-black tracking-wide leading-tight">
                  {dayStr} {schedule.monthName} {schedule.year}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDay(Math.min(schedule.totalDays, safeDay + 1))}
                disabled={safeDay >= schedule.totalDays}
                title="Hari Berikutnya"
                className="p-0.5 rounded hover:bg-white/20 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-white"
              >
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>

            {/* Quick Button: Hari Ini & Besok */}
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const todayNum = realNow.getDate();
                  if (todayNum >= 1 && todayNum <= schedule.totalDays) {
                    setActiveDay(todayNum);
                  }
                }}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all shadow-2xs cursor-pointer leading-tight ${
                  isSelectedDayRealToday
                    ? 'bg-amber-400 text-amber-950 shadow-inner'
                    : 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                }`}
              >
                Hari Ini
              </button>

              <button
                type="button"
                onClick={() => {
                  const tom = new Date(realNow.getTime() + 24 * 60 * 60 * 1000);
                  const tomDay = tom.getDate();
                  if (tomDay >= 1 && tomDay <= schedule.totalDays) {
                    setActiveDay(tomDay);
                  }
                }}
                className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-white/15 hover:bg-white/25 text-white border border-white/20 transition-all shadow-2xs cursor-pointer leading-tight"
              >
                Besok (H-1)
              </button>
            </div>

            {/* Direct WhatsApp Share Button */}
            <button
              type="button"
              onClick={handleShareToWhatsApp}
              className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-extrabold bg-[#25D366] hover:bg-[#20bd5a] text-white transition-all shadow-xs active:scale-95 cursor-pointer ml-auto sm:ml-0 leading-tight"
              title="Buka WhatsApp & Kirim Teks Penugasan"
            >
              <MessageCircle className="w-3 h-3 fill-white text-[#25D366]" />
              <span>Bagikan WA</span>
              <ExternalLink className="w-2.5 h-2.5 text-white/80" />
            </button>
          </div>
        </div>

        {/* Summary Stats Pills - Termasuk Shif Pagi */}
        <div className="grid grid-cols-2 sm:grid-cols-6 gap-1 mt-1 pt-1 border-t border-white/15 text-xs">
          <div className="bg-sky-500/20 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between border border-sky-300/30">
            <span className="text-[9px] text-sky-200 font-medium leading-none">Pos Pagi (P1-P3)</span>
            <span className="font-extrabold text-[11px] text-sky-100 leading-none">{morningStaffList.length} <span className="text-[8.5px] font-normal text-sky-200">org</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between">
            <span className="text-[9px] text-emerald-100 font-medium leading-none">Pos Masjid (S4A)</span>
            <span className="font-extrabold text-[11px] leading-none">{totalMasjid} <span className="text-[8.5px] font-normal text-emerald-200">org</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between">
            <span className="text-[9px] text-emerald-100 font-medium leading-none">Kantin SMP (S2A)</span>
            <span className="font-extrabold text-[11px] leading-none">{totalKantinSMP} <span className="text-[8.5px] font-normal text-emerald-200">org</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between">
            <span className="text-[9px] text-emerald-100 font-medium leading-none">Kantin SMA (S3A)</span>
            <span className="font-extrabold text-[11px] leading-none">{totalKantinSMA} <span className="text-[8.5px] font-normal text-emerald-200">org</span></span>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between">
            <span className="text-[9px] text-purple-200 font-medium leading-none">Mobile (Jaga Malam)</span>
            <span className="font-extrabold text-[11px] text-purple-100 leading-none">{totalMobile} <span className="text-[8.5px] font-normal text-purple-200">org</span></span>
          </div>

          <div className="col-span-2 sm:col-span-1 bg-white/15 backdrop-blur-xs rounded px-1.5 py-0.5 flex items-center justify-between border border-white/20">
            <span className="text-[9px] text-amber-200 font-bold leading-none">Total Tugas</span>
            <span className="font-black text-[11px] text-amber-300 leading-none">{totalAssigned + morningStaffList.length} <span className="text-[8.5px] font-normal text-white">staf</span></span>
          </div>
        </div>
      </div>

      {/* Main Content Layout: 2 Columns on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-1.5 sm:gap-2 items-start">
        {/* Left Column: The Pos Cards (col-span-7) */}
        <div className="lg:col-span-7 space-y-1.5">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                Daftar Pos & Penempatan Petugas
              </h3>
            </div>

            <button
              type="button"
              onClick={handleResetToAuto}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 px-2 py-1 rounded-md transition-colors cursor-pointer"
              title="Kembalikan susunan petugas ke jadwal acuan otomatis"
            >
              <RotateCcw className="w-3 h-3 text-slate-400" />
              <span>Reset Standar Jadwal</span>
            </button>
          </div>

          {/* Pos Jaga Pagi (P1, P2, P3: UKS SD / SMP / SMA & Mobile) Card */}
          <div className="rounded-md border border-sky-300 dark:border-sky-800/70 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="px-2 py-1.5 border-b border-sky-200 dark:border-sky-800/60 bg-sky-50 dark:bg-sky-950/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] bg-sky-600 text-white shadow-2xs">
                  <Sun className="w-3 h-3 text-amber-200" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-[11.5px] text-sky-950 dark:text-sky-100 leading-tight">
                      Pos Jaga Shif Pagi (07:00 - 15:00)
                    </span>
                    <span className="px-1 py-0.1 rounded text-[8px] font-black bg-sky-700 text-white leading-none">
                      P1, P2, P3
                    </span>
                  </div>
                  <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">
                    Penugasan UKS SD, UKS SMP, UKS SMA, atau Mobile Keliling
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {/* Include in WhatsApp toggle */}
                <button
                  type="button"
                  onClick={() => setIncludeMorningInShare(prev => !prev)}
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                    includeMorningInShare 
                      ? 'bg-sky-600 text-white shadow-xs' 
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-300 dark:border-slate-700'
                  }`}
                  title="Sertakan pos pagi di teks WhatsApp"
                >
                  <Check className={`w-2.5 h-2.5 ${includeMorningInShare ? 'opacity-100' : 'opacity-20'}`} />
                  <span>Sertakan di WA</span>
                </button>

                <span className="px-1.5 py-0.1 rounded-full text-[8.5px] font-bold bg-white dark:bg-slate-800 border border-sky-200 dark:border-sky-800 text-sky-800 dark:text-sky-300 leading-tight">
                  {morningStaffList.length} Petugas
                </span>
              </div>
            </div>

            {/* Staff list for morning post */}
            <div className="p-1 sm:p-1.5">
              {morningStaffList.length === 0 ? (
                <div className="py-2 text-center text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/30 rounded border border-dashed border-slate-200 dark:border-slate-800">
                  Tidak ada petugas shif pagi (P1/P2/P3) pada tanggal ini.
                </div>
              ) : (
                <div className="space-y-1">
                  {morningStaffList.map((item) => {
                    const isAssigned = !!item.postTitle;
                    return (
                      <div
                        key={item.staff.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-sky-50/50 hover:bg-sky-50 dark:bg-sky-950/20 dark:hover:bg-sky-950/40 border border-sky-200/70 dark:border-sky-800/40 text-[11px] transition-colors"
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`px-1 py-0.2 rounded text-[8.5px] font-black leading-none ${
                            item.shift === 'P1' 
                              ? 'bg-blue-600 text-white' 
                              : item.shift === 'P2' 
                              ? 'bg-teal-600 text-white' 
                              : 'bg-indigo-600 text-white'
                          }`}>
                            {item.shift}
                          </span>
                          <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {item.staff.name}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            ({item.staff.gender === 'L' ? 'Ikhwan' : 'Akhwat'})
                          </span>

                          {/* Current status pill */}
                          <span className={`ml-1 px-1.5 py-0.2 rounded-md text-[9px] font-bold border ${
                            isAssigned
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700'
                              : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700'
                          }`}>
                            {isAssigned ? `📍 ${item.postTitle}` : 'Belum Dipilih Pos'}
                          </span>

                          {/* Quran Assistance Label */}
                          {item.quranAssistance && (
                            <span className="px-1.5 py-0.2 rounded-md text-[9px] font-bold border bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-200 dark:border-emerald-700 flex items-center gap-0.5">
                              <span>📖</span>
                              <span>{item.quranAssistance}</span>
                            </span>
                          )}
                        </div>

                        {/* Quick Selection Buttons */}
                        <div className="flex items-center gap-1 flex-wrap shrink-0">
                          {morningOptions.map((opt) => {
                            const isCurrent = item.postTitle === opt.label;
                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleAssignMorningPost(item.staff, opt.label, opt.id)}
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold transition-all cursor-pointer ${
                                  isCurrent
                                    ? 'bg-emerald-600 text-white shadow-2xs scale-102 ring-1 ring-emerald-400'
                                    : 'bg-white dark:bg-slate-800 hover:bg-sky-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                                }`}
                                title={`Tugaskan ${item.staff.name} ke ${opt.label}`}
                              >
                                {opt.label}
                              </button>
                            );
                          })}

                          {isAssigned && (
                            <button
                              type="button"
                              onClick={() => handleClearMorningPost(item.staff)}
                              className="px-1 py-0.5 rounded text-[9px] text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors cursor-pointer font-bold"
                              title="Reset penugasan pos"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Pos Cards Loop */}
          {(Object.keys(POS_CONFIG) as PosCategory[]).map((posKey) => {
            const conf = POS_CONFIG[posKey];
            const items = posData[posKey];
            const Icon = conf.icon;

            return (
              <div
                key={posKey}
                className={`rounded-md border bg-white dark:bg-slate-900 shadow-2xs overflow-hidden transition-all ${conf.borderColor}`}
              >
                {/* Pos Card Header - Rapat */}
                <div className={`px-2 py-1 border-b flex items-center justify-between ${conf.lightBg} ${conf.borderColor}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-4 h-4 rounded flex items-center justify-center font-bold text-[9px] ${conf.badgeBg}`}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-[11.5px] text-slate-900 dark:text-white leading-tight">
                          {conf.title}
                        </span>
                        <span className="px-1 py-0.1 rounded text-[8px] font-black bg-slate-900 text-white dark:bg-white dark:text-slate-900 leading-none">
                          {conf.codeTag}
                        </span>
                      </div>
                      <p className="text-[9.5px] text-slate-500 dark:text-slate-400 leading-none mt-0.2">
                        {conf.desc}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="px-1.5 py-0.1 rounded-full text-[8.5px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 shadow-2xs leading-tight">
                      {items.length} Petugas
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowAddStaffModal(posKey)}
                      title={`Tambah Petugas ke ${conf.title}`}
                      className="p-0.5 rounded text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 dark:hover:bg-emerald-950/50 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Staff List Inside Pos - Rapat */}
                <div className="p-1 sm:p-1.5">
                  {items.length === 0 ? (
                    <div className="py-1.5 text-center text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50/50 dark:bg-slate-950/30 rounded border border-dashed border-slate-200 dark:border-slate-800">
                      Belum ada petugas di pos ini. Klik <span className="font-semibold text-emerald-600">+ Tambah</span> atau pindahkan staf dari pos lain.
                    </div>
                  ) : (
                    <div className="space-y-0.5">
                      {items.map((item, idx) => {
                        const isEditingThis = editingItemId === item.id;

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between gap-1 px-1.5 py-0.5 rounded bg-slate-50/80 hover:bg-slate-100/90 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-700/60 text-[11px] transition-colors"
                          >
                            {/* Left: Number & Name */}
                            <div className="flex items-center gap-1 min-w-0 flex-1">
                              <span className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[8.5px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>

                              {isEditingThis ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <input
                                    type="text"
                                    value={editNameValue}
                                    onChange={(e) => setEditNameValue(e.target.value)}
                                    placeholder="Ubah nama tampilan..."
                                    className="px-1 py-0.2 text-[10.5px] rounded border border-emerald-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none w-full max-w-[180px]"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveRename(posKey, item.id);
                                      if (e.key === 'Escape') setEditingItemId(null);
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleSaveRename(posKey, item.id)}
                                    className="px-1.5 py-0.2 rounded bg-emerald-600 text-white font-bold text-[9px] hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Simpan
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setEditingItemId(null)}
                                    className="px-1 py-0.2 text-slate-400 hover:text-slate-600 text-[9px] cursor-pointer"
                                  >
                                    Batal
                                  </button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 min-w-0 truncate">
                                  <span className="font-semibold text-slate-900 dark:text-slate-100 truncate text-[11px]">
                                    {item.customName || item.name}
                                  </span>
                                  {item.customName && (
                                    <span className="text-[8px] text-amber-600 dark:text-amber-400 font-medium shrink-0">
                                      (kustom)
                                    </span>
                                  )}
                                  <span className={`px-1 py-0.1 rounded text-[8px] font-bold shrink-0 leading-tight ${
                                    item.shiftCode === 'M3'
                                      ? 'bg-fuchsia-600 text-white'
                                      : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                                  }`}>
                                    {item.shiftCode === 'M3' ? 'M3 (Patroli 23:00)' : item.shiftCode}
                                  </span>
                                </div>
                              )}
                            </div>

                            {/* Right Actions: Reorder, Move to other Pos, Edit Name, Delete */}
                            <div className="flex items-center gap-0.5 shrink-0">
                              {/* Quick Move To Pos Dropdown */}
                              <select
                                aria-label="Pindahkan Pos Tugas"
                                value={posKey}
                                onChange={(e) => handleMoveStaff(item.id, posKey, e.target.value as PosCategory)}
                                className="text-[9px] font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded px-1 py-0.2 text-slate-700 dark:text-slate-200 focus:outline-none cursor-pointer hover:border-emerald-500"
                                title="Pindahkan ke pos lain"
                              >
                                <option value="masjid">🕌 Pos Masjid</option>
                                <option value="kantin_smp">🏫 Kantin SMP</option>
                                <option value="kantin_sma">🎓 Kantin SMA</option>
                                <option value="mobile">🌙 Jaga Malam</option>
                              </select>

                              {/* Reorder Up/Down */}
                              <div className="flex items-center bg-white dark:bg-slate-900 rounded border border-slate-200 dark:border-slate-700 overflow-hidden">
                                <button
                                  type="button"
                                  onClick={() => handleReorderStaff(posKey, idx, 'up')}
                                  disabled={idx === 0}
                                  title="Geser Naik"
                                  className="px-0.5 py-0 text-[8.5px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                >
                                  ▲
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReorderStaff(posKey, idx, 'down')}
                                  disabled={idx === items.length - 1}
                                  title="Geser Turun"
                                  className="px-0.5 py-0 text-[8.5px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 cursor-pointer"
                                >
                                  ▼
                                </button>
                              </div>

                              {/* Edit Custom Name Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingItemId(item.id);
                                  setEditNameValue(item.customName || item.name);
                                }}
                                title="Edit format nama yang dibagikan"
                                className="p-0.5 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>

                              {/* Remove from Pos Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveStaff(posKey, item.id)}
                                title="Hapus dari pos ini"
                                className="p-0.5 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                              >
                                <Trash2 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: WhatsApp Live Preview & Quick Actions (col-span-5) */}
        <div className="lg:col-span-5 space-y-1.5 sticky top-14">
          {/* WhatsApp Preview Card - Rapat */}
          <div className="rounded-md border border-emerald-300 dark:border-emerald-800/70 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            {/* WA Card Header */}
            <div className="px-2 py-1 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center font-bold">
                  <MessageCircle className="w-2.5 h-2.5 text-white" />
                </div>
                <div>
                  <h4 className="text-[11.5px] font-bold leading-tight">
                    Pratinjau Pesan WhatsApp
                  </h4>
                  <p className="text-[9px] text-emerald-100 leading-none">
                    Format rapi sesuai standar dinas grup WA
                  </p>
                </div>
              </div>

              {/* Copy quick indicator */}
              {copied && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.1 rounded-full bg-white text-emerald-800 text-[9px] font-bold animate-in fade-in">
                  <Check className="w-2.5 h-2.5 text-emerald-600" /> Tersalin!
                </span>
              )}
            </div>

            {/* Simulated WhatsApp Chat Bubble */}
            <div className="p-1.5 bg-[#e5ddd5]/40 dark:bg-slate-950/60">
              <div className="bg-[#dcf8c6] dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 rounded-md p-1.5 shadow-2xs font-mono text-[10px] sm:text-[10.5px] text-slate-800 dark:text-emerald-100 whitespace-pre-wrap leading-relaxed select-all">
                {waMessage}
              </div>
            </div>

            {/* Action Buttons Under Preview */}
            <div className="p-1.5 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 space-y-1">
              <div className="grid grid-cols-2 gap-1">
                {/* Salin Teks Button */}
                <button
                  type="button"
                  onClick={handleCopyWhatsApp}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded font-bold text-xs bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 active:scale-95 transition-all shadow-2xs cursor-pointer leading-tight"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400 dark:text-emerald-600" />
                      <span>Tersalin</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 text-slate-300 dark:text-slate-600" />
                      <span>Salin WA</span>
                    </>
                  )}
                </button>

                {/* Buka WhatsApp Button */}
                <button
                  type="button"
                  onClick={handleShareToWhatsApp}
                  className="flex items-center justify-center gap-1 px-2 py-1 rounded font-bold text-xs bg-[#25D366] hover:bg-[#20bd5a] text-white active:scale-95 transition-all shadow-2xs cursor-pointer leading-tight"
                >
                  <MessageCircle className="w-3 h-3 fill-white text-[#25D366]" />
                  <span>Kirim WA</span>
                </button>
              </div>

              <div className="flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400 pt-0.2">
                <span>Total: {totalAssigned} Petugas</span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center gap-1 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer font-medium"
                >
                  <Printer className="w-2.5 h-2.5" />
                  <span>Cetak Lembar</span>
                </button>
              </div>
            </div>
          </div>

          {/* Template & Options Accordion */}
          <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1.5 shadow-2xs space-y-1">
            <div className="flex items-center gap-1 text-[10.5px] font-bold text-slate-800 dark:text-slate-200">
              <Clock className="w-2.5 h-2.5 text-emerald-600" />
              <span>Kustomisasi Format & Waktu Tugas</span>
            </div>

            <div className="space-y-1 text-xs">
              <div>
                <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.2">
                  Rentang Jam Dinas:
                </label>
                <input
                  type="text"
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  placeholder="15.00 s.d. 22.00"
                  className="w-full px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.2">
                  Kalimat Pembuka (Header):
                </label>
                <input
                  type="text"
                  value={headerPrefix}
                  onChange={(e) => setHeaderPrefix(e.target.value)}
                  placeholder="izin share untuk pembagian pos shift sore dan m hari ini nggih"
                  className="w-full px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-slate-500 dark:text-slate-400 mb-0.2">
                  Kalimat Penutup (Footer):
                </label>
                <input
                  type="text"
                  value={footerNote}
                  onChange={(e) => setFooterNote(e.target.value)}
                  placeholder="Mohon ditindaklanjuti"
                  className="w-full px-1.5 py-0.5 rounded bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="pt-0.2 flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setTimeRange('15.00 s.d. 22.00');
                    setHeaderPrefix('izin share untuk pembagian pos shift sore dan m hari ini nggih');
                    setFooterNote('Mohon ditindaklanjuti');
                    showToast('Template kalimat dikembalikan ke awal.');
                  }}
                  className="text-[9px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline cursor-pointer"
                >
                  Reset Template Teks
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah Petugas Manual ke Pos Tertentu */}
      {showAddStaffModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-4 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b pb-2 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-xs ${POS_CONFIG[showAddStaffModal].badgeBg}`}>
                  <Plus className="w-3.5 h-3.5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tambah Petugas ke {POS_CONFIG[showAddStaffModal].title}
                  </h4>
                  <p className="text-[10px] text-slate-500">
                    Pilih nama wali asuh untuk ditempatkan pada pos ini
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddStaffModal(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 cursor-pointer text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Staff Selector List */}
            <div className="max-h-64 overflow-y-auto space-y-1 pr-1">
              {staffList.map((st) => {
                const dayShifts = schedule.days[safeDay] || {};
                const currentShift = dayShifts[st.id] || '-';
                const isAlreadyInPos = posData[showAddStaffModal].some((p) => p.staffId === st.id);

                return (
                  <button
                    key={st.id}
                    type="button"
                    disabled={isAlreadyInPos}
                    onClick={() => handleAddStaffToPos(showAddStaffModal, st)}
                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors text-left ${
                      isAlreadyInPos
                        ? 'opacity-40 bg-slate-100 dark:bg-slate-800 cursor-not-allowed'
                        : 'hover:bg-emerald-50 dark:hover:bg-slate-800 border border-slate-100 dark:border-slate-800 cursor-pointer'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-6">
                        {st.code || `#${st.id}`}
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {st.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        Shif: {currentShift}
                      </span>
                      {isAlreadyInPos && (
                        <span className="text-[9px] text-emerald-600 font-bold">
                          ✓ Sudah ada
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddStaffModal(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
