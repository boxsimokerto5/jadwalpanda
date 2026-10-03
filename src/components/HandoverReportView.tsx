import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Send, 
  Copy, 
  Check, 
  Printer, 
  Plus, 
  Trash2, 
  Users, 
  Activity, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  HeartPulse,
  History,
  BookmarkCheck,
  Search,
  X,
  RotateCcw,
  UserPlus,
  Moon,
  CheckSquare
} from 'lucide-react';
import { MonthSchedule, Staff, ShiftCode, HandoverReport, SickStudent, Student, HandoverShiftMode } from '../types';
import { SHIFT_DEFINITIONS } from '../data/initialSchedule';
import { ALL_STUDENTS_DATA, TOTAL_STUDENTS_COUNT } from '../data/studentsData';
import { StudentPickerModal } from './StudentPickerModal';
import { soundManager } from '../utils/audio';
import { subscribeToHandoverReports, saveHandoverReportsToSupabase } from '../utils/supabaseBackend';

export const DEFAULT_ACTIVITIES_BY_SHIFT: Record<string, string[]> = {
  PAGI_KE_SORE: [
    'Mendata siswa sakit',
    'Mengantarkan siswa sakit ke UKS',
    'Pendampingan Makan Siang',
    'Pendampingan loundry time siswa SD',
  ],
  SORE_KE_MALAM: [
    'Mendampingi siswa ibadah sholat Asar berjamaah di Masjid',
    'Mendampingi siswa ibadah sholat Maghrib berjamaah di Masjid',
    'Pendampingan Mengaji',
    'Mendampingi siswa ibadah sholat Isak berjamaah di Masjid',
    'Pendampingan Makan Malam',
    'Evaluasi Malam',
    'Pendampingan Belajar',
  ],
  MALAM_KE_PAGI: [
    'Memastikan siswa telah istirahat tepat waktu.',
    'Membangunkan siswa',
    'Mendampingi siswa ibadah sholat Subuh berjamaah di Masjid',
    'Mendampingi siswa Makan Pagi',
  ],
  PAGI: [
    'Mendata siswa sakit',
    'Mengantarkan siswa sakit ke UKS',
    'Pendampingan Makan Siang',
    'Pendampingan loundry time siswa SD',
  ],
  SORE: [
    'Mendampingi siswa ibadah sholat Asar berjamaah di Masjid',
    'Mendampingi siswa ibadah sholat Maghrib berjamaah di Masjid',
    'Pendampingan Mengaji',
    'Mendampingi siswa ibadah sholat Isak berjamaah di Masjid',
    'Pendampingan Makan Malam',
    'Evaluasi Malam',
    'Pendampingan Belajar',
  ],
  MALAM: [
    'Memastikan siswa telah istirahat tepat waktu.',
    'Membangunkan siswa',
    'Mendampingi siswa ibadah sholat Subuh berjamaah di Masjid',
    'Mendampingi siswa Makan Pagi',
  ],
};

export const getDefaultActivitiesForShift = (mode: string): string[] => {
  return DEFAULT_ACTIVITIES_BY_SHIFT[mode] || DEFAULT_ACTIVITIES_BY_SHIFT.PAGI_KE_SORE;
};

export const DEFAULT_COMPLETED_ACTIVITIES = DEFAULT_ACTIVITIES_BY_SHIFT.PAGI_KE_SORE;

interface HandoverReportViewProps {
  schedule: MonthSchedule;
  staffList: Staff[];
  selectedStaffId: number;
  activeDay: number;
  setActiveDay: (day: number) => void;
}

export const HandoverReportView: React.FC<HandoverReportViewProps> = ({
  schedule,
  staffList,
  selectedStaffId,
  activeDay,
  setActiveDay,
}) => {
  // Current active staff
  const currentStaff = staffList.find((s) => s.id === selectedStaffId) || staffList[0] || {
    id: 0,
    name: 'Petugas Piket',
    role: 'Wali Asuh',
    group: 'Umum',
    initials: '-',
    gender: 'L' as const,
  };

  // Shift handover mode: PAGI_KE_SORE | SORE_KE_MALAM | MALAM_KE_PAGI
  const [shiftType, setShiftType] = useState<HandoverShiftMode>('PAGI_KE_SORE');
  
  // Time of handover
  const [handoverTime, setHandoverTime] = useState<string>('15:00');

  // Student summary counts
  const [studentTotal, setStudentTotal] = useState<number>(TOTAL_STUDENTS_COUNT);
  const [studentPresent, setStudentPresent] = useState<number>(TOTAL_STUDENTS_COUNT);
  const [studentFasting, setStudentFasting] = useState<number>(0);

  // Sick students list - default empty
  const [sickStudents, setSickStudents] = useState<SickStudent[]>([]);
  const [quickSickSearch, setQuickSickSearch] = useState<string>('');
  const [showSickDropdown, setShowSickDropdown] = useState<boolean>(false);

  // Text notes - Catatan Tindak Lanjut
  const [specialIncidents, setSpecialIncidents] = useState<string>(
    'lakukan perawatan siswa sakit dan kegiatan pendampingan'
  );

  // Activities executed during shift - initialized to active shift preset
  const [completedActivities, setCompletedActivities] = useState<string[]>(() =>
    getDefaultActivitiesForShift('PAGI_KE_SORE')
  );
  const [newActivityInput, setNewActivityInput] = useState<string>('');

  const handleAddActivity = (text?: string) => {
    const val = (text !== undefined ? text : newActivityInput).trim();
    if (!val) return;
    setCompletedActivities(prev => [...prev, val]);
    setNewActivityInput('');
    soundManager.playChime();
  };

  const handleRemoveActivity = (indexToRemove: number) => {
    setCompletedActivities(prev => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleUpdateActivity = (indexToUpdate: number, newText: string) => {
    setCompletedActivities(prev => prev.map((act, idx) => idx === indexToUpdate ? newText : act));
  };

  const handleResetActivities = () => {
    setCompletedActivities([...getDefaultActivitiesForShift(shiftType)]);
    soundManager.playChime();
    const shiftLabel = (shiftType === 'PAGI_KE_SORE' || shiftType === 'PAGI') ? 'Shif Pagi' : (shiftType === 'SORE_KE_MALAM' || shiftType === 'SORE') ? 'Shif Sore' : 'Shif Malam';
    showToast(`Daftar kegiatan dikembalikan ke standar ${shiftLabel}.`);
  };

  // Copy and save feedback
  const [copied, setCopied] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState<boolean>(false);
  const [showStudentPicker, setShowStudentPicker] = useState<boolean>(false);
  const [pickerTargetId, setPickerTargetId] = useState<string | null>(null);
  const [savedReports, setSavedReports] = useState<HandoverReport[]>(() => {
    try {
      const saved = localStorage.getItem('srt1_handover_reports') || localStorage.getItem('srma24_handover_reports');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Subscribe to Supabase Cloud handover reports
  useEffect(() => {
    const unsubscribe = subscribeToHandoverReports((cloudReports) => {
      if (cloudReports && Array.isArray(cloudReports)) {
        setSavedReports(cloudReports);
        try {
          localStorage.setItem('srt1_handover_reports', JSON.stringify(cloudReports));
        } catch {}
      }
    });
    return () => unsubscribe();
  }, []);

  // Save reports to Supabase whenever updated
  const persistReports = (updated: HandoverReport[]) => {
    setSavedReports(updated);
    try {
      localStorage.setItem('srt1_handover_reports', JSON.stringify(updated));
      saveHandoverReportsToSupabase(updated);
    } catch (e) {
      console.warn('Failed to save handover reports:', e);
    }
  };

  // Calculate outgoing and incoming staff automatically from current schedule
  const { 
    defaultOutgoingStaff, 
    defaultIncomingStaff, 
    nextShiftLabel, 
    outgoingShiftLabel,
    handoverTitle,
    suggestedTime,
    outShiftTag,
    inShiftTag,
    targetOutgoingDay,
    targetIncomingDay
  } = useMemo(() => {
    const isPagiToSore = shiftType === 'PAGI_KE_SORE' || shiftType === 'PAGI';
    const isSoreToMalam = shiftType === 'SORE_KE_MALAM' || shiftType === 'SORE';
    
    let outgoingCodes: ShiftCode[] = [];
    let incomingCodes: ShiftCode[] = [];
    let outDay = activeDay;
    let inDay = activeDay;
    let nextLabel = '';
    let outLabel = '';
    let title = '';
    let defaultTime = '15:00';
    let outTag = 'PAGI';
    let inTag = 'SORE';

    if (isPagiToSore) {
      // 1. Pagi ke Sore (Penerima: Shift Sore - tetap melampirkan petugas shift sore & malam)
      // Yang menyerahkan: Pagi hari ini (Tgl N) - termasuk P, P1, P2, P3, P4, P5
      // Yang menerima: Sore & Malam hari ini (Tgl N)
      outgoingCodes = ['P', 'P1', 'P2', 'P3', 'P4', 'P5'];
      incomingCodes = ['S', 'S2A', 'S3A', 'S4A', 'M', 'M1', 'M2', 'M3'];
      outDay = activeDay;
      inDay = activeDay;
      outLabel = `Shift Pagi (Tgl ${activeDay})`;
      nextLabel = `Shift Sore (Tgl ${activeDay})`;
      title = 'SERAH TERIMA SHIFT PAGI KE SORE';
      defaultTime = '15:00';
      outTag = 'PAGI';
      inTag = 'SORE';
    } else if (isSoreToMalam) {
      // 2. Sore ke Malam (Pihak yang menyerahkan: judulnya tetap Shift Sore, tetapi isinya petugas shift Sore & Malam)
      // Yang menyerahkan: Sore & Malam hari ini (Tgl N)
      // Yang menerima: Malam hari ini (Tgl N)
      outgoingCodes = ['S', 'S2A', 'S3A', 'S4A', 'M', 'M1', 'M2', 'M3'];
      incomingCodes = ['M', 'M1', 'M2', 'M3'];
      outDay = activeDay;
      inDay = activeDay;
      outLabel = `Shift Sore (Tgl ${activeDay})`;
      nextLabel = `Shift Malam (Tgl ${activeDay})`;
      title = 'SERAH TERIMA SHIFT SORE KE MALAM';
      defaultTime = '23:00';
      outTag = 'SORE';
      inTag = 'MALAM';
    } else {
      // 3. Malam ke Pagi (Pagi Tgl N menerima dari Malam hari sebelumnya Tgl N-1)
      // Contoh: Serah terima pagi tgl 2 -> Yang menyerahkan adalah Piket Malam tgl 1, Yang menerima adalah Piket Pagi tgl 2 (P, P1, P2, P3, P4, P5)
      outgoingCodes = ['M', 'M1', 'M2', 'M3'];
      incomingCodes = ['P', 'P1', 'P2', 'P3', 'P4', 'P5'];
      outDay = activeDay > 1 ? activeDay - 1 : schedule.totalDays;
      inDay = activeDay;
      outLabel = `Shift Malam (Kemarin Tgl ${outDay})`;
      nextLabel = `Shift Pagi (Hari Ini Tgl ${inDay})`;
      title = 'SERAH TERIMA SHIFT MALAM KE PAGI';
      defaultTime = '07:00';
      outTag = 'MALAM';
      inTag = 'PAGI';
    }

    const outDaySchedule = schedule?.days?.[outDay] || {};
    const inDaySchedule = schedule?.days?.[inDay] || {};

    // Filter outgoing staff from outDay
    const outgoing = staffList
      .filter((s) => {
        const code = outDaySchedule[s.id];
        return code && outgoingCodes.includes(code);
      })
      .map((s) => s.name);

    // Filter incoming staff from inDay
    const incoming = staffList
      .filter((s) => {
        const code = inDaySchedule[s.id];
        return code && incomingCodes.includes(code);
      })
      .map((s) => s.name);

    return {
      defaultOutgoingStaff: outgoing,
      defaultIncomingStaff: incoming,
      nextShiftLabel: nextLabel,
      outgoingShiftLabel: outLabel,
      handoverTitle: title,
      suggestedTime: defaultTime,
      outShiftTag: outTag,
      inShiftTag: inTag,
      targetOutgoingDay: outDay,
      targetIncomingDay: inDay,
    };
  }, [schedule, staffList, activeDay, shiftType]);

  // Switch shift mode handler with auto-time suggestion and auto-shift activities
  const handleSelectShiftMode = (newMode: HandoverShiftMode) => {
    setShiftType(newMode);
    if (newMode === 'PAGI_KE_SORE' || newMode === 'PAGI') {
      setHandoverTime('15:00');
    } else if (newMode === 'SORE_KE_MALAM' || newMode === 'SORE') {
      setHandoverTime('23:00');
    } else if (newMode === 'MALAM_KE_PAGI' || newMode === 'MALAM') {
      setHandoverTime('07:00');
    }
    // Automatically switch default activities to match chosen shift
    setCompletedActivities(getDefaultActivitiesForShift(newMode));
    soundManager.playChime();
  };

  // Editable lists for outgoing and incoming staff
  const [outgoingStaffList, setOutgoingStaffList] = useState<string[]>([]);
  const [incomingStaffList, setIncomingStaffList] = useState<string[]>([]);

  // Manual add staff control states
  const [showAddOutgoing, setShowAddOutgoing] = useState<boolean>(false);
  const [showAddIncoming, setShowAddIncoming] = useState<boolean>(false);
  const [selectedStaffOut, setSelectedStaffOut] = useState<string>('');
  const [selectedStaffIn, setSelectedStaffIn] = useState<string>('');

  // Sync with schedule when date/shift changes
  useEffect(() => {
    setOutgoingStaffList(defaultOutgoingStaff);
    setIncomingStaffList(defaultIncomingStaff);
  }, [defaultOutgoingStaff, defaultIncomingStaff]);

  // Handlers for removing staff (e.g. absent / tidak hadir)
  const handleRemoveOutgoingStaff = (idx: number) => {
    const removed = outgoingStaffList[idx];
    setOutgoingStaffList(prev => prev.filter((_, i) => i !== idx));
    soundManager.playGong();
    showToast(`${removed} dihapus dari daftar petugas menyerahkan.`);
  };

  const handleRemoveIncomingStaff = (idx: number) => {
    const removed = incomingStaffList[idx];
    setIncomingStaffList(prev => prev.filter((_, i) => i !== idx));
    soundManager.playGong();
    showToast(`${removed} dihapus dari daftar petugas menerima.`);
  };

  // Handlers for adding manual staff (e.g. masuk di jam tersebut)
  const handleAddOutgoingStaff = (nameToAdd: string) => {
    const name = nameToAdd.trim();
    if (!name) return;
    if (outgoingStaffList.includes(name)) {
      showToast(`${name} sudah ada dalam daftar.`);
      return;
    }
    setOutgoingStaffList(prev => [...prev, name]);
    setSelectedStaffOut('');
    setShowAddOutgoing(false);
    soundManager.playChime();
    showToast(`${name} berhasil ditambahkan ke petugas menyerahkan.`);
  };

  const handleAddIncomingStaff = (nameToAdd: string) => {
    const name = nameToAdd.trim();
    if (!name) return;
    if (incomingStaffList.includes(name)) {
      showToast(`${name} sudah ada dalam daftar.`);
      return;
    }
    setIncomingStaffList(prev => [...prev, name]);
    setSelectedStaffIn('');
    setShowAddIncoming(false);
    soundManager.playChime();
    showToast(`${name} berhasil ditambahkan ke petugas menerima.`);
  };

  // Reset to roster
  const handleResetOutgoingStaff = () => {
    setOutgoingStaffList(defaultOutgoingStaff);
    soundManager.playChime();
    showToast('Daftar petugas menyerahkan dikembalikan sesuai jadwal roster.');
  };

  const handleResetIncomingStaff = () => {
    setIncomingStaffList(defaultIncomingStaff);
    soundManager.playChime();
    showToast('Daftar petugas menerima dikembalikan sesuai jadwal roster.');
  };

  // Quick search results for sick students from database
  const quickSickResults = useMemo(() => {
    if (!quickSickSearch.trim()) return [];
    const q = quickSickSearch.toLowerCase();
    return ALL_STUDENTS_DATA.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.class && s.class.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [quickSickSearch]);

  const handleQuickAddSickStudent = (student: Student) => {
    soundManager.playChime();
    const studentDisplayName = `${student.name} (${student.class})`;
    const newId = `sick_${Date.now()}`;
    const newSick: SickStudent = {
      id: newId,
      name: studentDisplayName,
      roomOrClass: student.class || '',
      symptoms: '',
      actionTaken: '',
    };
    setSickStudents((prev) => [...prev, newSick]);
    setQuickSickSearch('');
    setShowSickDropdown(false);
    showToast(`Santri ${student.name} ditambahkan. Silakan ketik sakitnya di kolom.`);
    setTimeout(() => {
      const inputEl = document.getElementById(`sick-input-${newId}`);
      if (inputEl) inputEl.focus();
    }, 120);
  };

  const handleQuickAddCustomSick = () => {
    if (!quickSickSearch.trim()) return;
    soundManager.playChime();
    const newId = `sick_${Date.now()}`;
    const newSick: SickStudent = {
      id: newId,
      name: quickSickSearch.trim(),
      roomOrClass: '',
      symptoms: '',
      actionTaken: '',
    };
    setSickStudents((prev) => [...prev, newSick]);
    setQuickSickSearch('');
    setShowSickDropdown(false);
    showToast(`Santri ditambahkan. Silakan ketik sakitnya di kolom.`);
    setTimeout(() => {
      const inputEl = document.getElementById(`sick-input-${newId}`);
      if (inputEl) inputEl.focus();
    }, 120);
  };

  // Form helpers for sick students
  const handleAddSickStudent = () => {
    const newStudent: SickStudent = {
      id: Date.now().toString(),
      name: '',
      roomOrClass: '',
      symptoms: '',
      actionTaken: '',
    };
    setSickStudents([...sickStudents, newStudent]);
    soundManager.playGong();
  };

  const handleOpenSickPicker = (targetId?: string) => {
    setPickerTargetId(targetId || null);
    setShowStudentPicker(true);
  };

  const handleUpdateSickStudent = (id: string, field: keyof SickStudent, val: string) => {
    setSickStudents(sickStudents.map(s => s.id === id ? { ...s, [field]: val } : s));
  };

  const handleRemoveSickStudent = (id: string) => {
    setSickStudents(sickStudents.filter(s => s.id !== id));
  };

  // Student picked handler from database
  const handleStudentPicked = (student: Student) => {
    soundManager.playChime();
    const studentDisplayName = `${student.name} (${student.class})`;

    if (pickerTargetId) {
      // Update existing item
      setSickStudents(prev => prev.map(s => s.id === pickerTargetId ? {
        ...s,
        name: studentDisplayName,
      } : s));
    } else {
      // Add new item
      const newSick: SickStudent = {
        id: Date.now().toString(),
        name: studentDisplayName,
        roomOrClass: '',
        symptoms: '',
        actionTaken: '',
      };
      setSickStudents(prev => [...prev, newSick]);
    }
    setToastMessage(`Santri ${student.name} (${student.class}) berhasil dipilih.`);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Generate WhatsApp text report
  const generateWhatsAppReportText = () => {
    const dayName = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'][
      new Date(schedule.year, schedule.month - 1, activeDay).getDay()
    ];

    const outgoingStaffText = outgoingStaffList.length > 0
      ? outgoingStaffList.map((name, idx) => `  ${idx + 1}. *${name}*`).join('\n')
      : '  _(Belum ada petugas / Tidak ada yang hadir)_';

    const incomingStaffText = incomingStaffList.length > 0
      ? incomingStaffList.map((name, idx) => `  ${idx + 1}. *${name}*`).join('\n')
      : '  _(Belum ada petugas / Tidak ada yang hadir)_';

    const sickText = sickStudents.length > 0
      ? sickStudents.map((s, idx) => {
          const studentName = s.name || 'Santri';
          const illnessDesc = s.symptoms ? ` - ${s.symptoms}` : '';
          const actionDesc = s.actionTaken ? ` [Tindakan: ${s.actionTaken}]` : '';
          return `  ${idx + 1}. ${studentName}${illnessDesc}${actionDesc}`;
        }).join('\n')
      : `  _Nihil (Seluruh ${studentTotal || TOTAL_STUDENTS_COUNT} anak asuh dalam keadaan sehat & bugar)_`;

    const activitiesText = completedActivities.length > 0
      ? completedActivities.map((act, idx) => `  ${idx + 1}. ${act}`).join('\n')
      : '  _Tidak ada catatan kegiatan khusus_';

    return `*📋 LAPORAN ${handoverTitle}*
*SEKOLAH RAKYAT TERINTEGRASI 1 KEDIRI*
*Pelayanan Wali Asuh*
━━━━━━━━━━━━━━━━━━━━
📅 *Hari/Tanggal:* ${dayName}, ${activeDay} ${schedule.monthName} ${schedule.year}
⏰ *Waktu Serah Terima:* ${handoverTime} WIB
🔄 *Pergantian:* *${handoverTitle}*
    • Menyerahkan: ${outgoingShiftLabel}
    • Menerima: ${nextShiftLabel}

📊 *KONDISI SISWA & ASRAMA:*
• Total Siswa Asrama: *${studentTotal} Anak Asuh*
• Hadir di Asrama: *${studentPresent} Anak Asuh*
• Sakit / di UKS: *${sickStudents.length} Anak Asuh*
• Siswa Berpuasa: *${studentFasting} Anak Asuh*

🏥 *DATA SISWA SAKIT / UKS:*
${sickText}

👤 *PETUGAS YANG MENYERAHKAN (${outgoingShiftLabel}):*
${outgoingStaffText}

👥 *PETUGAS YANG MENERIMA (${nextShiftLabel}):*
${incomingStaffText}
━━━━━━━━━━━━━━━━━━━━
📝 *CATATAN TINDAK LANJUT:*
${specialIncidents || 'lakukan perawatan siswa sakit dan kegiatan pendampingan'}
━━━━━━━━━━━━━━━━━━━━
📌 *KEGIATAN YANG TELAH DILAKSANAKAN:*
${activitiesText}
━━━━━━━━━━━━━━━━━━━━
_Laporan Serah Terima disusun oleh Wali Asuh SRT 1 Kediri_`;
  };

  // Copy text to clipboard
  const handleCopyText = async () => {
    const text = generateWhatsAppReportText();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      soundManager.playChime();
      showToast('Format teks laporan berhasil disalin ke clipboard!');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin otomatis, silakan pilih dan salin manual.');
    }
  };

  // Send to WhatsApp
  const handleSendToWhatsApp = () => {
    const text = generateWhatsAppReportText();
    soundManager.playBell();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Save report to local storage history
  const handleSaveReport = () => {
    const newReport: HandoverReport = {
      id: Date.now().toString(),
      dateStr: `${schedule.year}-${String(schedule.month).padStart(2, '0')}-${String(activeDay).padStart(2, '0')}`,
      day: activeDay,
      month: schedule.month,
      year: schedule.year,
      shiftType,
      handoverTime,
      outgoingStaffIds: outgoingStaffList.map(name => staffList.find(s => s.name === name)?.id || 0),
      outgoingStaffNames: outgoingStaffList,
      incomingStaffIds: incomingStaffList.map(name => staffList.find(s => s.name === name)?.id || 0),
      incomingStaffNames: incomingStaffList,
      studentCountTotal: studentTotal,
      studentCountPresent: studentPresent,
      studentCountPermit: 0,
      studentCountSick: sickStudents.length,
      studentCountFasting: studentFasting,
      sickStudents,
      permits: [],
      cleanlinessStatus: 'Sangat Bersih',
      disciplineStatus: 'Kondusif & Tertib',
      specialIncidents,
      completedActivities,
      inventoryNotes: '',
      notesForNextShift: '',
      submittedBy: currentStaff.name,
      submittedAt: new Date().toLocaleString('id-ID'),
    };

    const updated = [newReport, ...savedReports.slice(0, 19)];
    persistReports(updated);
    soundManager.playChime();
    showToast('Laporan serah terima berhasil disimpan ke database Cloud & riwayat!');
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Print handover report
  const handlePrintHandover = () => {
    soundManager.playChime();
    window.print();
  };

  return (
    <div className="space-y-3 pb-8">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 p-3 rounded-xl bg-slate-900 text-white border border-slate-700 shadow-xl flex items-center gap-2.5 text-xs font-semibold animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-4 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-2.5 print:hidden">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-xs">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                Laporan Serah Terima Pergantian Shift
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                Format Resmi WA
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Dokumentasi kondisi siswa, asrama, inventaris, dan daftar lampiran petugas shif berikutnya
            </p>
          </div>
        </div>

        {/* Action Buttons Top */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-colors"
          >
            <History className="w-3.5 h-3.5 text-blue-500" />
            <span>Riwayat ({savedReports.length})</span>
          </button>
          <button
            onClick={handleSaveReport}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <BookmarkCheck className="w-3.5 h-3.5" />
            <span>Simpan</span>
          </button>
          <button
            onClick={handleCopyText}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-semibold transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Tersalin!' : 'Salin Teks'}</span>
          </button>
          <button
            onClick={handleSendToWhatsApp}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Kirim via WhatsApp</span>
          </button>
          <button
            onClick={handlePrintHandover}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Cetak</span>
          </button>
        </div>
      </div>

      {/* Control & Shift Selection Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
        <div className="flex flex-wrap items-center gap-3">
          {/* Day Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Tanggal:</span>
            <select
              aria-label="Pilih tanggal laporan"
              value={activeDay}
              onChange={(e) => setActiveDay(Number(e.target.value))}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none"
            >
              {Array.from({ length: schedule.totalDays }, (_, i) => i + 1).map((d) => (
                <option key={d} value={d}>
                  Tgl {d} {schedule.monthName} {schedule.year}
                </option>
              ))}
            </select>
          </div>

          {/* Shift Type Being Handed Over */}
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">Pilihan Serah Terima:</span>
            <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => handleSelectShiftMode('PAGI_KE_SORE')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  shiftType === 'PAGI_KE_SORE'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Pagi ➡️ Sore
              </button>
              <button
                type="button"
                onClick={() => handleSelectShiftMode('SORE_KE_MALAM')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  shiftType === 'SORE_KE_MALAM'
                    ? 'bg-orange-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Sore ➡️ Malam
              </button>
              <button
                type="button"
                onClick={() => handleSelectShiftMode('MALAM_KE_PAGI')}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                  shiftType === 'MALAM_KE_PAGI'
                    ? 'bg-indigo-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Malam ➡️ Pagi
              </button>
            </div>
          </div>

          {/* Handover Time Input */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 dark:text-slate-400">Jam Serah Terima:</span>
            <input
              type="time"
              value={handoverTime}
              onChange={(e) => setHandoverTime(e.target.value)}
              className="bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 dark:text-slate-100"
            />
          </div>
        </div>

        <div className="text-[11px] text-slate-500 dark:text-slate-400 italic">
          💡 Data nama petugas otomatis disesuaikan dari Roster Jadwal
        </div>
      </div>

      {/* Main Two-Column Layout: Form Editor on Left, Live WhatsApp Preview on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 print:block">
        {/* Left Column: Handover Form Editor (7 cols) */}
        <div className="lg:col-span-7 space-y-3 print:hidden">
          {/* Section 1: Staff Handover (Outgoing & Incoming) */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  1. Petugas Piket & Pergantian Shift
                </h3>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                  {handoverTitle}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Outgoing Staff */}
              <div className="p-2.5 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-emerald-900 dark:text-emerald-300">
                    Menyerahkan ({outgoingShiftLabel}):
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-900/60 px-1.5 py-0.2 rounded">
                      {outgoingStaffList.length} Orang
                    </span>
                    {(outgoingStaffList.length !== defaultOutgoingStaff.length || 
                      !outgoingStaffList.every((v, i) => v === defaultOutgoingStaff[i])) && (
                      <button
                        type="button"
                        onClick={handleResetOutgoingStaff}
                        title="Reset daftar petugas ke jadwal roster"
                        className="text-[10px] text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5 ml-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Outgoing Staff */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {outgoingStaffList.length > 0 ? (
                    outgoingStaffList.map((name, idx) => {
                      const st = staffList.find(s => s.name === name);
                      const shiftCode = st ? schedule.days?.[targetOutgoingDay]?.[st.id] : '';
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-emerald-200/80 dark:border-slate-700 shadow-xs hover:border-emerald-300 dark:hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {name}
                            </span>
                            {st && (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ${
                                st.gender === 'L' 
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {st.gender}
                              </span>
                            )}
                            {st?.jenjang && st.jenjang !== '-' && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                                {st.jenjang}
                              </span>
                            )}
                            {shiftCode && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800 shrink-0">
                                {shiftCode}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveOutgoingStaff(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors ml-1 shrink-0"
                            title="Hapus / Wali Asuh Tidak Hadir"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10.5px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800/60 text-center italic">
                      Tidak ada petugas yang hadir. Tambahkan manual di bawah jika ada petugas pengganti.
                    </div>
                  )}
                </div>

                {/* Add Outgoing Staff Manual Form/Button */}
                {showAddOutgoing ? (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-700 space-y-1.5 animate-in fade-in">
                    <label className="text-[10.5px] font-bold text-emerald-800 dark:text-emerald-300 block">
                      + Tambah Wali Asuh yang Masuk / Lembur:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        list="staff-names-list"
                        value={selectedStaffOut}
                        onChange={(e) => setSelectedStaffOut(e.target.value)}
                        placeholder="Pilih / ketik nama wali asuh..."
                        className="flex-1 text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddOutgoingStaff(selectedStaffOut);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddOutgoingStaff(selectedStaffOut)}
                        disabled={!selectedStaffOut.trim()}
                        className="px-2 py-1 rounded bg-emerald-600 text-white font-bold text-[11px] hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Tambah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddOutgoing(false);
                          setSelectedStaffOut('');
                        }}
                        className="px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddOutgoing(true)}
                    className="w-full py-1 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-lg border border-emerald-200 dark:border-emerald-800/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Tambah Manual Wali Asuh
                  </button>
                )}
              </div>

              {/* Incoming Staff (Next Shift) */}
              <div className="p-2.5 rounded-lg border border-blue-200 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[11px] text-blue-900 dark:text-blue-200">
                    Menerima ({nextShiftLabel}):
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] font-bold text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/60 px-1.5 py-0.2 rounded">
                      {incomingStaffList.length} Orang
                    </span>
                    {(incomingStaffList.length !== defaultIncomingStaff.length || 
                      !incomingStaffList.every((v, i) => v === defaultIncomingStaff[i])) && (
                      <button
                        type="button"
                        onClick={handleResetIncomingStaff}
                        title="Reset daftar petugas ke jadwal roster"
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 ml-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* List of Incoming Staff */}
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {incomingStaffList.length > 0 ? (
                    incomingStaffList.map((name, idx) => {
                      const st = staffList.find(s => s.name === name);
                      const shiftCode = st ? schedule.days?.[targetIncomingDay]?.[st.id] : '';
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center justify-between text-[11px] bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-lg border border-blue-200 dark:border-slate-700 shadow-xs hover:border-blue-300 dark:hover:border-slate-600 transition-colors"
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <span className="text-slate-400 dark:text-slate-500 font-mono text-[10px] shrink-0">
                              {idx + 1}.
                            </span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                              {name}
                            </span>
                            {st && (
                              <span className={`text-[9px] px-1 py-0.2 rounded font-bold shrink-0 ${
                                st.gender === 'L' 
                                  ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800' 
                                  : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800'
                              }`}>
                                {st.gender}
                              </span>
                            )}
                            {st?.jenjang && st.jenjang !== '-' && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-semibold bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 shrink-0">
                                {st.jenjang}
                              </span>
                            )}
                            {shiftCode && (
                              <span className="text-[9px] px-1 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 shrink-0">
                                {shiftCode}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveIncomingStaff(idx)}
                            className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors ml-1 shrink-0"
                            title="Hapus / Wali Asuh Tidak Hadir"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-[10.5px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-2 rounded border border-amber-200 dark:border-amber-800/60 text-center italic">
                      Tidak ada petugas yang hadir. Tambahkan manual di bawah jika ada petugas pengganti.
                    </div>
                  )}
                </div>

                {/* Add Incoming Staff Manual Form/Button */}
                {showAddIncoming ? (
                  <div className="p-2 rounded-lg bg-white dark:bg-slate-800 border border-blue-300 dark:border-blue-700 space-y-1.5 animate-in fade-in">
                    <label className="text-[10.5px] font-bold text-blue-800 dark:text-blue-300 block">
                      + Tambah Wali Asuh yang Masuk / Lembur:
                    </label>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        list="staff-names-list"
                        value={selectedStaffIn}
                        onChange={(e) => setSelectedStaffIn(e.target.value)}
                        placeholder="Pilih / ketik nama wali asuh..."
                        className="flex-1 text-[11px] px-2 py-1 rounded border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleAddIncomingStaff(selectedStaffIn);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => handleAddIncomingStaff(selectedStaffIn)}
                        disabled={!selectedStaffIn.trim()}
                        className="px-2 py-1 rounded bg-blue-600 text-white font-bold text-[11px] hover:bg-blue-700 disabled:opacity-50"
                      >
                        Tambah
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddIncoming(false);
                          setSelectedStaffIn('');
                        }}
                        className="px-1.5 py-1 rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAddIncoming(true)}
                    className="w-full py-1 text-[11px] font-semibold text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 rounded-lg border border-blue-200 dark:border-blue-800/80 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    Tambah Manual Wali Asuh
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: Student Population & Attendance */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  2. Kondisi Siswa & Kehadiran Asrama
                </h3>
              </div>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => {
                    setStudentTotal(TOTAL_STUDENTS_COUNT);
                    setStudentPresent(TOTAL_STUDENTS_COUNT);
                    setSickStudents([]);
                    soundManager.playChime();
                  }}
                  className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-200"
                >
                  ⚡ Preset: Semua Hadir & Sehat
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                <label className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 block truncate">Total Santri</label>
                <input
                  type="number"
                  value={studentTotal}
                  onChange={(e) => setStudentTotal(Number(e.target.value))}
                  className="w-full text-base font-bold bg-transparent text-slate-900 dark:text-white focus:outline-none"
                />
              </div>
              <div className="p-2 rounded-lg border border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/40 dark:bg-emerald-950/20">
                <label className="text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 block truncate">Hadir di Asrama</label>
                <input
                  type="number"
                  value={studentPresent}
                  onChange={(e) => setStudentPresent(Number(e.target.value))}
                  className="w-full text-base font-bold bg-transparent text-emerald-900 dark:text-emerald-100 focus:outline-none"
                />
              </div>
              <div className="p-2 rounded-lg border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20">
                <label className="text-[10px] font-semibold text-rose-700 dark:text-rose-300 block truncate">Sakit / UKS</label>
                <input
                  type="number"
                  value={sickStudents.length}
                  readOnly
                  className="w-full text-base font-bold bg-transparent text-rose-900 dark:text-rose-100 focus:outline-none cursor-default"
                />
              </div>
              <div className="p-2 rounded-lg border border-amber-200 dark:border-amber-900/60 bg-amber-50/50 dark:bg-amber-950/20">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 block truncate flex items-center gap-1">
                    <Moon className="w-2.5 h-2.5 text-amber-500" />
                    <span>Siswa Berpuasa</span>
                  </label>
                  {studentFasting > 0 && (
                    <button
                      type="button"
                      onClick={() => setStudentFasting(0)}
                      className="text-[9px] font-bold text-amber-600 hover:text-rose-600 transition-colors"
                      title="Reset 0"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <input
                    type="number"
                    min="0"
                    max={studentTotal}
                    value={studentFasting === 0 ? '' : studentFasting}
                    onChange={(e) => {
                      const val = e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0);
                      setStudentFasting(val);
                    }}
                    placeholder="0"
                    className="w-full text-base font-bold bg-transparent text-amber-900 dark:text-amber-100 focus:outline-none"
                  />
                  <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 shrink-0">
                    anak
                  </span>
                </div>
              </div>
            </div>

            {/* Sub-section: Siswa Sakit */}
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-700">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-lg bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 flex items-center justify-center font-bold text-xs">
                    <HeartPulse className="w-3.5 h-3.5" />
                  </span>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-rose-800 dark:text-rose-300">
                      Daftar Santri Sakit / UKS
                    </span>
                    <span className="ml-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                      {sickStudents.length} santri
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenSickPicker()}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition-colors"
                  >
                    <Users className="w-3.5 h-3.5" />
                    Pilih dari {TOTAL_STUDENTS_COUNT} Siswa
                  </button>
                  <button
                    type="button"
                    onClick={handleAddSickStudent}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 transition-colors"
                    title="Tambah baris manual"
                  >
                    <Plus className="w-3.5 h-3.5" /> Manual
                  </button>
                </div>
              </div>

              {/* Kotak Pencarian Cepat Santri Sakit (Ketik nama langsung muncul & klik untuk isi sakit) */}
              <div className="relative">
                <div className="flex items-center gap-2 bg-rose-50/70 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800/80 rounded-xl px-3 py-2 shadow-2xs focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-500/20 transition-all">
                  <Search className="w-4 h-4 text-rose-500 shrink-0" />
                  <input
                    type="text"
                    placeholder="🔍 Ketik nama santri untuk langsung tambah (contoh: Ahmad, Fathan, Zaidan)..."
                    value={quickSickSearch}
                    onChange={(e) => {
                      setQuickSickSearch(e.target.value);
                      setShowSickDropdown(true);
                    }}
                    onFocus={() => {
                      if (quickSickSearch.trim()) setShowSickDropdown(true);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (quickSickResults.length > 0) {
                          handleQuickAddSickStudent(quickSickResults[0]);
                        } else if (quickSickSearch.trim()) {
                          handleQuickAddCustomSick();
                        }
                      }
                    }}
                    className="w-full bg-transparent text-xs font-medium text-slate-900 dark:text-white placeholder-rose-400/80 dark:placeholder-rose-500/60 focus:outline-none"
                  />
                  {quickSickSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setQuickSickSearch('');
                        setShowSickDropdown(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Hasil Pencarian Otomatis */}
                {showSickDropdown && quickSickSearch.trim().length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-xl shadow-xl z-40 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/60">
                    {quickSickResults.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-500 dark:text-slate-400">
                        <span>Nama "{quickSickSearch}" tidak ada di daftar {TOTAL_STUDENTS_COUNT} siswa.</span>
                        <button
                          type="button"
                          onClick={handleQuickAddCustomSick}
                          className="block mt-1 mx-auto text-rose-600 dark:text-rose-400 font-bold hover:underline"
                        >
                          + Tetap tambahkan "{quickSickSearch}"
                        </button>
                      </div>
                    ) : (
                      quickSickResults.map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => handleQuickAddSickStudent(st)}
                          className="w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-slate-800 dark:text-white">{st.name}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 font-semibold">
                              {st.class}
                            </span>
                          </div>
                          <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/40 px-2 py-0.5 rounded-lg">
                            + Tambah & Isi Sakit
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              {/* Daftar Santri Sakit yang Ditambahkan */}
              {sickStudents.length === 0 ? (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-1">
                  <HeartPulse className="w-5 h-5 text-slate-300 dark:text-slate-600" />
                  <span>Nihil — Belum ada santri sakit yang dicatat pada shif ini.</span>
                  <span className="text-[11px] text-slate-400">Ketik nama pada kolom di atas untuk menambahkan santri secara cepat.</span>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {sickStudents.map((sick, idx) => (
                    <div key={sick.id} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 p-2 rounded-xl border border-rose-200/80 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 shadow-2xs">
                      {/* Nomor & Nama Siswa */}
                      <div className="flex items-center gap-1.5 sm:w-1/2 min-w-[180px]">
                        <span className="w-5 text-center text-xs font-bold font-mono text-rose-700 dark:text-rose-300 shrink-0">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          placeholder="Nama Siswa"
                          value={sick.name}
                          onChange={(e) => handleUpdateSickStudent(sick.id, 'name', e.target.value)}
                          className="w-full bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-rose-500"
                        />
                      </div>

                      {/* Kolom Kecil: Sakitnya Apa */}
                      <div className="flex items-center gap-1.5 flex-1 pl-6 sm:pl-0">
                        <input
                          id={`sick-input-${sick.id}`}
                          type="text"
                          placeholder="Sakitnya apa? (cth: Demam 38°C, Batuk, Sakit Gigi...)"
                          value={sick.symptoms}
                          onChange={(e) => handleUpdateSickStudent(sick.id, 'symptoms', e.target.value)}
                          className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:ring-1 focus:ring-rose-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveSickStudent(sick.id)}
                          className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/80 transition-colors shrink-0"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Section 3: Catatan Tindak Lanjut */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  3. Catatan Tindak Lanjut
                </h3>
              </div>
            </div>

            {/* Special Incidents / Catatan Tindak Lanjut */}
            <div>
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1 flex items-center justify-between">
                <span>Catatan Tindak Lanjut:</span>
                <span className="text-[10px] text-slate-400 font-normal">Tindak lanjut untuk shif selanjutnya</span>
              </label>
              <textarea
                rows={3}
                value={specialIncidents}
                onChange={(e) => setSpecialIncidents(e.target.value)}
                placeholder="Tuliskan catatan tindak lanjut..."
                className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          {/* Section 4: Kegiatan yang Telah Dilaksanakan */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  4. Kegiatan yang Telah Dilaksanakan
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  {completedActivities.length} Kegiatan
                </span>
                <button
                  type="button"
                  onClick={handleResetActivities}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 text-[10px]"
                  title="Kembalikan ke daftar kegiatan standar shif ini"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span className="hidden sm:inline">Reset Default</span>
                </button>
              </div>
            </div>

            {/* Activities List with Auto Dynamic Numbering */}
            <div className="space-y-1.5">
              {completedActivities.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-900/30">
                  Belum ada kegiatan yang dimasukkan. Silakan tambahkan kegiatan di bawah.
                </div>
              ) : (
                completedActivities.map((act, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 p-1.5 sm:p-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-900/40 hover:border-emerald-300 dark:hover:border-emerald-800 transition-all shadow-2xs"
                  >
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 text-xs font-bold font-mono flex items-center justify-center shrink-0 border border-emerald-200/80 dark:border-emerald-800/80">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={act}
                      onChange={(e) => handleUpdateActivity(idx, e.target.value)}
                      placeholder={`Nama kegiatan ke-${idx + 1}...`}
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveActivity(idx)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors shrink-0"
                      title="Hapus kegiatan ini (nomor urut akan menyesuaikan otomatis)"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Input to Add New Activity */}
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="text"
                value={newActivityInput}
                onChange={(e) => setNewActivityInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddActivity();
                  }
                }}
                placeholder="Ketik kegiatan baru lalu tekan Enter / klik Tambah..."
                className="flex-1 bg-white dark:bg-slate-900 border border-emerald-300/80 dark:border-emerald-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
              <button
                type="button"
                onClick={() => handleAddActivity()}
                disabled={!newActivityInput.trim()}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 text-white text-xs font-bold flex items-center gap-1 shrink-0 shadow-xs transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Live WhatsApp & Official Document Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-3">
          {/* WhatsApp Message Preview Box */}
          <div className="bg-[#0b141a] text-slate-100 rounded-xl p-3.5 border border-slate-800 shadow-md flex flex-col space-y-2.5 print:hidden">
            {/* Header WA Bar */}
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                  <Send className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-bold text-xs text-emerald-400 leading-tight">
                    Pratinjau Format WhatsApp
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Grup Resmi Wali Asuh SRT 1 Kab Kediri
                  </div>
                </div>
              </div>
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition-colors"
                title="Salin isi pesan"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>

            {/* WA Chat Bubble Preview */}
            <div className="bg-[#1f2c34] p-3 rounded-lg border border-slate-700/60 font-mono text-[11px] leading-relaxed text-slate-200 whitespace-pre-wrap max-h-[520px] overflow-y-auto select-text shadow-inner">
              {generateWhatsAppReportText()}
            </div>

            {/* Action Bar Under WA Preview */}
            <div className="pt-1 flex flex-wrap items-center gap-2">
              <button
                onClick={handleSendToWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all active:scale-[0.98]"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Langsung ke WA</span>
              </button>
              <button
                onClick={handleSaveReport}
                className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors flex items-center gap-1"
                title="Simpan Laporan ke Riwayat"
              >
                <BookmarkCheck className="w-4 h-4 text-indigo-400" />
                <span>Simpan</span>
              </button>
            </div>
          </div>

          {/* Quick Helper Tips Card */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs space-y-1.5 text-xs print:hidden">
            <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Petunjuk Serah Terima Shift:</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400 text-[11px]">
              <li>Laporan dibuat menjelang akhir jam shif (misal pukul 15:30 untuk shif pagi).</li>
              <li>Nama lengkap wali asuh shif berikutnya terlampir otomatis sesuai jadwal di sistem.</li>
              <li>Daftar santri yang sakit / di UKS dicatat baris per baris secara ringkas.</li>
              <li>Tekan <strong>"Kirim Langsung ke WA"</strong> untuk mengirim ke grup WA asrama secara instan.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* PRINT-ONLY OFFICIAL DOCUMENT VIEW (Hidden in screen, shown on print / PDF) */}
      <div className="hidden print:block text-black bg-white p-6 space-y-4 font-serif text-sm">
        {/* Kop Surat Resmi */}
        <div className="text-center border-b-2 border-black pb-3 space-y-1">
          <h2 className="text-xs uppercase tracking-widest font-bold">KEMENTERIAN SOSIAL REPUBLIK INDONESIA</h2>
          <h1 className="text-base font-extrabold uppercase">SEKOLAH RAKYAT TERINTEGRASI 1 KEDIRI</h1>
          <p className="text-xs italic">Penugasan & Pelayanan Wali Asuh Siswa / Anak Asuh</p>
          <div className="pt-2 font-sans font-bold text-sm uppercase underline decoration-1 underline-offset-4">
            BERITA ACARA & LAPORAN SERAH TERIMA PERGANTIAN SHIFT WALI ASUH
          </div>
        </div>

        {/* Identitas Laporan */}
        <table className="w-full text-xs border-collapse">
          <tbody>
            <tr>
              <td className="w-36 font-bold py-1">Hari, Tanggal</td>
              <td className="w-4">:</td>
              <td>{activeDay} {schedule.monthName} {schedule.year}</td>
              <td className="w-36 font-bold py-1">Waktu Serah Terima</td>
              <td className="w-4">:</td>
              <td>{handoverTime} WIB</td>
            </tr>
            <tr>
              <td className="font-bold py-1">Shif Yang Berakhir</td>
              <td>:</td>
              <td>{outgoingShiftLabel}</td>
              <td className="font-bold py-1">Shif Yang Menerima</td>
              <td>:</td>
              <td>{nextShiftLabel}</td>
            </tr>
          </tbody>
        </table>

        {/* Tabel Petugas Pergantian */}
        <div className="grid grid-cols-2 gap-4">
          <div className="border border-black p-2 rounded">
            <div className="font-bold text-xs uppercase mb-1">1. Petugas Menyerahkan ({outgoingShiftLabel}):</div>
            <ol className="list-decimal list-inside text-xs space-y-0.5">
              {outgoingStaffList.map((name, idx) => (
                <li key={idx}>
                  <strong>{name}</strong>
                </li>
              ))}
            </ol>
          </div>

          <div className="border border-black p-2 rounded">
            <div className="font-bold text-xs uppercase mb-1">2. Petugas Menerima ({nextShiftLabel}):</div>
            <ol className="list-decimal list-inside text-xs space-y-0.5">
              {incomingStaffList.map((name, idx) => (
                <li key={idx}>
                  <strong>{name}</strong>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Kondisi Siswa */}
        <div className="border border-black p-2 rounded text-xs space-y-1.5">
          <div className="font-bold uppercase">3. Kondisi & Kehadiran Santri / Siswa Asrama:</div>
          <div className="grid grid-cols-4 gap-2 text-center py-1 bg-slate-100 border border-slate-300 font-sans">
            <div>Total: <strong>{studentTotal}</strong></div>
            <div>Hadir di Asrama: <strong>{studentPresent}</strong></div>
            <div>Sakit / UKS: <strong>{sickStudents.length}</strong></div>
            <div>Siswa Berpuasa: <strong>{studentFasting}</strong></div>
          </div>

          {sickStudents.length > 0 && (
            <div className="pt-1">
              <strong>Daftar Santri Sakit / UKS:</strong>
              <ol className="list-decimal list-inside space-y-0.5 pt-0.5">
                {sickStudents.map((s, i) => (
                  <li key={i}>
                    {s.name} {s.symptoms ? `— (${s.symptoms})` : ''}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>

        {/* Catatan Tindak Lanjut */}
        <div className="border border-black p-2 rounded text-xs space-y-1">
          <div className="font-bold uppercase">4. Catatan Tindak Lanjut:</div>
          <p>{specialIncidents || 'lakukan perawatan siswa sakit dan kegiatan pendampingan'}</p>
        </div>

        {/* Kegiatan yang Telah Dilaksanakan */}
        <div className="border border-black p-2 rounded text-xs space-y-1">
          <div className="font-bold uppercase">5. Kegiatan yang Telah Dilaksanakan:</div>
          {completedActivities.length > 0 ? (
            <ol className="list-decimal list-inside space-y-0.5 pt-0.5">
              {completedActivities.map((act, idx) => (
                <li key={idx}>
                  <span>{act}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="italic text-slate-500">- Tidak ada catatan kegiatan -</p>
          )}
        </div>

        {/* Tanda Tangan Serah Terima */}
        <div className="grid grid-cols-2 text-center text-xs pt-6">
          <div>
            <p>Petugas Yang Menyerahkan,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">({currentStaff.name})</p>
            <p className="text-[10px]">Wali Asuh Shif Berakhir</p>
          </div>
          <div>
            <p>Petugas Yang Menerima,</p>
            <div className="h-16"></div>
            <p className="font-bold underline">({incomingStaffList[0] || '....................................'})</p>
            <p className="text-[10px]">Wali Asuh Shif Berikutnya</p>
          </div>
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-2xl w-full p-4 border border-slate-200 dark:border-slate-700 shadow-2xl space-y-3 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                  Riwayat Laporan Serah Terima Tersimpan
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-700"
              >
                Tutup
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {savedReports.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Belum ada riwayat laporan yang disimpan. Tekan tombol <strong>"Simpan"</strong> saat selesai mengisi laporan.
                </div>
              ) : (
                savedReports.map((rep) => (
                  <div
                    key={rep.id}
                    className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 dark:text-white">
                        Tgl {rep.day}/{rep.month}/{rep.year} • Shif {rep.shiftType} ({rep.handoverTime} WIB)
                      </span>
                      <span className="text-[10px] text-slate-500">
                        Disusun oleh: {rep.submittedBy}
                      </span>
                    </div>
                    <div className="text-slate-600 dark:text-slate-400 text-[11px] flex flex-wrap gap-x-2">
                      <span>Santri Hadir: <strong>{rep.studentCountPresent}</strong></span>
                      <span>•</span>
                      <span>Sakit: <strong>{rep.sickStudents?.length || 0}</strong></span>
                      <span>•</span>
                      <span>Puasa: <strong>{rep.studentCountFasting || 0}</strong></span>
                    </div>
                    <div className="pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Petugas Lanjutan: {rep.incomingStaffNames?.slice(0, 3).join(', ')}...</span>
                      <button
                        onClick={() => {
                          setShiftType(rep.shiftType);
                          setHandoverTime(rep.handoverTime);
                          setStudentTotal(rep.studentCountTotal);
                          setStudentPresent(rep.studentCountPresent);
                          setSickStudents(rep.sickStudents || []);
                          setStudentFasting(rep.studentCountFasting || 0);
                          setSpecialIncidents(rep.specialIncidents);
                          if (rep.completedActivities && rep.completedActivities.length > 0) {
                            setCompletedActivities(rep.completedActivities);
                          } else {
                            setCompletedActivities(getDefaultActivitiesForShift(rep.shiftType || shiftType));
                          }
                          if (rep.outgoingStaffNames) setOutgoingStaffList(rep.outgoingStaffNames);
                          if (rep.incomingStaffNames) setIncomingStaffList(rep.incomingStaffNames);
                          setShowHistoryModal(false);
                          showToast('Data laporan berhasil dimuat ke editor!');
                        }}
                        className="px-2 py-0.5 rounded bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800 hover:bg-blue-100"
                      >
                        Muat ke Editor
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      {/* Student Picker Modal from Students Database */}
      <StudentPickerModal
        isOpen={showStudentPicker}
        onClose={() => {
          setShowStudentPicker(false);
          setPickerTargetId(null);
        }}
        onSelectStudent={handleStudentPicked}
        mode="sick"
        title={`Pilih Anak Asuh yang Sakit (Database ${TOTAL_STUDENTS_COUNT} Siswa)`}
      />

      {/* Datalist for autocomplete on direct typing */}
      <datalist id="all-students-names">
        {ALL_STUDENTS_DATA.map((st) => (
          <option key={st.no} value={`${st.name} (${st.class})`}>
            {`#${st.no} - ${st.gender} | Ibu: ${st.motherName}`}
          </option>
        ))}
      </datalist>

      {/* Datalist for staff selection */}
      <datalist id="staff-names-list">
        {staffList.map((st) => (
          <option key={st.id} value={st.name}>
            {`${st.code || ''} - ${st.role}`}
          </option>
        ))}
      </datalist>
    </div>
  );
};
