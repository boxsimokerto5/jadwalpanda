import React, { useState, useMemo, useRef, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Search, 
  Pill, 
  Stethoscope, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Printer, 
  Trash2, 
  Edit3, 
  X, 
  FileText, 
  HeartPulse, 
  CalendarDays, 
  Check, 
  Share2, 
  RotateCcw,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { StudentMedicalPlan, MedicalFacility, MedicalPlanType, MedicalStatus, Staff, Student } from '../types';
import { StudentPickerModal } from './StudentPickerModal';
import { soundManager } from '../utils/audio';

interface StudentMedicalViewProps {
  plans: StudentMedicalPlan[];
  onSavePlan: (plan: StudentMedicalPlan) => Promise<boolean>;
  onDeletePlan: (planId: string) => Promise<boolean>;
  staffList: Staff[];
  selectedStaffId: number;
  cloudStatus?: 'connected' | 'offline' | 'error' | 'syncing';
  onRefreshFromServer?: () => Promise<{ success: boolean; count: number; plans: StudentMedicalPlan[] } | void>;
  scheduleYear?: number;
  scheduleMonth?: number;
  activeScheduleDay?: number;
}

const INDONESIAN_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

export const StudentMedicalView: React.FC<StudentMedicalViewProps> = ({
  plans,
  onSavePlan,
  onDeletePlan,
  staffList,
  selectedStaffId,
  cloudStatus = 'connected',
  onRefreshFromServer,
  scheduleYear,
  scheduleMonth,
  activeScheduleDay,
}) => {
  // Manual server sync state
  const [isRefreshingServer, setIsRefreshingServer] = useState(false);
  
  // Calendar View month & year initialized to schedule date (e.g. September 2026) or first plan's date
  const [calendarYear, setCalendarYear] = useState<number>(() => {
    if (scheduleYear && scheduleYear >= 2024) return scheduleYear;
    if (plans.length > 0 && plans[0].date && /^\d{4}-\d{2}-\d{2}$/.test(plans[0].date)) {
      return parseInt(plans[0].date.split('-')[0], 10);
    }
    return new Date().getFullYear();
  });

  const [calendarMonth, setCalendarMonth] = useState<number>(() => {
    if (scheduleMonth && scheduleMonth >= 1 && scheduleMonth <= 12) return scheduleMonth;
    if (plans.length > 0 && plans[0].date && /^\d{4}-\d{2}-\d{2}$/.test(plans[0].date)) {
      return parseInt(plans[0].date.split('-')[1], 10);
    }
    return new Date().getMonth() + 1; // 1-12
  });

  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);

  // Group plans by month to know which months have scheduled medical plans
  const monthsWithPlans = useMemo(() => {
    const map = new Map<string, { year: number; month: number; count: number; studentNames: string[] }>();
    plans.forEach(p => {
      if (p.date && /^\d{4}-\d{2}-\d{2}$/.test(p.date)) {
        const [yStr, mStr] = p.date.split('-');
        const y = parseInt(yStr, 10);
        const m = parseInt(mStr, 10);
        const key = `${y}-${m}`;
        const existing = map.get(key) || { year: y, month: m, count: 0, studentNames: [] };
        existing.count += 1;
        if (!existing.studentNames.includes(p.studentName)) {
          existing.studentNames.push(p.studentName);
        }
        map.set(key, existing);
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [plans]);

  // Auto-align calendar to month that actually contains active plans if viewing an empty month
  const autoJumpedRef = useRef(false);
  useEffect(() => {
    if (autoJumpedRef.current || plans.length === 0) return;
    const currentMonthHasPlans = plans.some(p => {
      if (!p.date || !/^\d{4}-\d{2}-\d{2}$/.test(p.date)) return false;
      const [y, m] = p.date.split('-').map(Number);
      return y === calendarYear && m === calendarMonth;
    });

    if (!currentMonthHasPlans) {
      // Find the plan matching scheduleYear/Month or the first available plan
      const schedulePlan = plans.find(p => {
        if (!p.date) return false;
        const [y, m] = p.date.split('-').map(Number);
        return y === scheduleYear && m === scheduleMonth;
      });
      const targetPlan = schedulePlan || plans[0];
      if (targetPlan && targetPlan.date && /^\d{4}-\d{2}-\d{2}$/.test(targetPlan.date)) {
        const [y, m] = targetPlan.date.split('-').map(Number);
        setCalendarYear(y);
        setCalendarMonth(m);
        autoJumpedRef.current = true;
      }
    }
  }, [plans, scheduleYear, scheduleMonth, calendarYear, calendarMonth]);

  // View mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Search and filters
  const [searchTerm, setSearchTerm] = useState('');
  const [facilityFilter, setFacilityFilter] = useState<'ALL' | MedicalFacility>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | MedicalStatus>('ALL');

  // Add / Edit Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<StudentMedicalPlan | null>(null);

  // Submit guard refs to prevent double-click / duplicate submission
  const isSubmittingRef = useRef(false);
  const lastSubmittedFingerprintRef = useRef<{ fingerprint: string; timestamp: number } | null>(null);

  // Delete confirmation modal state
  const [planToDelete, setPlanToDelete] = useState<StudentMedicalPlan | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Complete Plan Modal state
  const [completeModalPlan, setCompleteModalPlan] = useState<StudentMedicalPlan | null>(null);
  const [completeActionResult, setCompleteActionResult] = useState('');
  const [shouldScheduleFollowUp, setShouldScheduleFollowUp] = useState(false);
  const [followUpDate, setFollowUpDate] = useState('');
  const [followUpTime, setFollowUpTime] = useState('08:30');
  const [followUpNotes, setFollowUpNotes] = useState('');

  // Student Picker modal
  const [isStudentPickerOpen, setIsStudentPickerOpen] = useState(false);

  const pad = (n: number) => String(n).padStart(2, '0');
  const initialDateToUse = scheduleYear && scheduleMonth && activeScheduleDay 
    ? `${scheduleYear}-${pad(scheduleMonth)}-${pad(activeScheduleDay)}` 
    : new Date().toISOString().split('T')[0];

  // Form Fields
  const [formData, setFormData] = useState<{
    studentName: string;
    studentClassOrRoom: string;
    facility: MedicalFacility;
    facilityDetail: string;
    date: string;
    time: string;
    planType: MedicalPlanType;
    complaint: string;
    accompanyingStaffName: string;
    accompanyingStaffId?: number;
    notes: string;
  }>({
    studentName: '',
    studentClassOrRoom: '',
    facility: 'Puskesmas',
    facilityDetail: 'Puskesmas Semen Kediri',
    date: initialDateToUse,
    time: '08:30',
    planType: 'kontrol_kembali',
    complaint: '',
    accompanyingStaffName: staffList.find(s => s.id === selectedStaffId)?.name || 'Miftahudin',
    accompanyingStaffId: selectedStaffId,
    notes: '',
  });

  const [formError, setFormError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    soundManager.playChime();
    setTimeout(() => setToastMessage(null), 4000);
  };

  const now = new Date();
  const realTodayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const realTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const realTomorrowStr = `${realTomorrow.getFullYear()}-${pad(realTomorrow.getMonth() + 1)}-${pad(realTomorrow.getDate())}`;

  // Also calculate active schedule date key if app is viewing September 2026
  const scheduleTodayStr = scheduleYear && scheduleMonth && activeScheduleDay
    ? `${scheduleYear}-${pad(scheduleMonth)}-${pad(activeScheduleDay)}`
    : null;
  const scheduleTomorrowStr = scheduleYear && scheduleMonth && activeScheduleDay
    ? `${scheduleYear}-${pad(scheduleMonth)}-${pad(Math.min(activeScheduleDay + 1, 30))}`
    : null;

  const todayStr = scheduleTodayStr || realTodayStr;
  const tomorrowStr = scheduleTomorrowStr || realTomorrowStr;

  // Statistics
  const stats = useMemo(() => {
    const todayCount = plans.filter(p => 
      p.status === 'rencana' && (p.date === realTodayStr || (scheduleTodayStr && p.date === scheduleTodayStr))
    ).length;
    const tomorrowCount = plans.filter(p => 
      p.status === 'rencana' && (p.date === realTomorrowStr || (scheduleTomorrowStr && p.date === scheduleTomorrowStr))
    ).length;
    const totalPlanned = plans.filter(p => p.status === 'rencana').length;
    const totalCompleted = plans.filter(p => p.status === 'selesai').length;
    return { todayCount, tomorrowCount, totalPlanned, totalCompleted };
  }, [plans, realTodayStr, realTomorrowStr, scheduleTodayStr, scheduleTomorrowStr]);

  // Filtered plans
  const filteredPlans = useMemo(() => {
    return plans.filter(p => {
      // Keyword search
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const match = 
          p.studentName.toLowerCase().includes(q) ||
          p.studentClassOrRoom.toLowerCase().includes(q) ||
          p.complaint.toLowerCase().includes(q) ||
          p.accompanyingStaffName.toLowerCase().includes(q) ||
          (p.facilityDetail || '').toLowerCase().includes(q);
        if (!match) return false;
      }

      // Facility filter
      if (facilityFilter !== 'ALL' && p.facility !== facilityFilter) return false;

      // Status filter
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;

      // Date filter from calendar click
      if (selectedDateFilter && p.date !== selectedDateFilter) return false;

      return true;
    }).sort((a, b) => {
      // Sort: urgent dates first
      if (a.date === b.date) {
        return (a.time || '').localeCompare(b.time || '');
      }
      return a.date.localeCompare(b.date);
    });
  }, [plans, searchTerm, facilityFilter, statusFilter, selectedDateFilter]);

  // Calendar days generation
  const calendarDays = useMemo(() => {
    const totalDaysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
    const firstDayIndex = new Date(calendarYear, calendarMonth - 1, 1).getDay();
    // In Indonesia, Monday is usually 0, Sunday is 6. JavaScript: Sunday=0, Monday=1
    const startCol = (firstDayIndex + 6) % 7; // Monday = 0, ..., Sunday = 6

    const days: { dayNumber: number | null; dateStr: string | null; plansForDay: StudentMedicalPlan[] }[] = [];

    // Empty slots before 1st of month
    for (let i = 0; i < startCol; i++) {
      days.push({ dayNumber: null, dateStr: null, plansForDay: [] });
    }

    // Days of current month
    for (let d = 1; d <= totalDaysInMonth; d++) {
      const dateStr = `${calendarYear}-${pad(calendarMonth)}-${pad(d)}`;
      const plansForDay = plans.filter(p => p.date === dateStr);
      days.push({ dayNumber: d, dateStr, plansForDay });
    }

    return days;
  }, [calendarYear, calendarMonth, plans]);

  const handlePrevMonth = () => {
    if (calendarMonth === 1) {
      setCalendarMonth(12);
      setCalendarYear(calendarYear - 1);
    } else {
      setCalendarMonth(calendarMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 12) {
      setCalendarMonth(1);
      setCalendarYear(calendarYear + 1);
    } else {
      setCalendarMonth(calendarMonth + 1);
    }
  };

  const handleOpenAddModal = (defaultDate?: string) => {
    setEditingPlan(null);
    const dateToUse = defaultDate || `${calendarYear}-${pad(calendarMonth)}-${pad(Math.min(activeScheduleDay || 1, 28))}`;
    setFormData({
      studentName: '',
      studentClassOrRoom: '',
      facility: 'Puskesmas',
      facilityDetail: 'Puskesmas Semen Kediri',
      date: dateToUse,
      time: '08:30',
      planType: 'kontrol_kembali',
      complaint: '',
      accompanyingStaffName: staffList.find(s => s.id === selectedStaffId)?.name || 'Miftahudin',
      accompanyingStaffId: selectedStaffId,
      notes: '',
    });
    setFormError(null);
    isSubmittingRef.current = false;
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (plan: StudentMedicalPlan) => {
    setEditingPlan(plan);
    setFormData({
      studentName: plan.studentName,
      studentClassOrRoom: plan.studentClassOrRoom,
      facility: plan.facility,
      facilityDetail: plan.facilityDetail || '',
      date: plan.date,
      time: plan.time || '08:30',
      planType: plan.planType,
      complaint: plan.complaint,
      accompanyingStaffName: plan.accompanyingStaffName,
      accompanyingStaffId: plan.accompanyingStaffId,
      notes: plan.notes || '',
    });
    setFormError(null);
    isSubmittingRef.current = false;
    setIsModalOpen(true);
  };

  const handleStudentSelect = (student: Student) => {
    setFormData(prev => ({
      ...prev,
      studentName: student.name,
      studentClassOrRoom: `${student.class} (${student.gender === 'Laki-laki' ? 'Asrama Putra' : 'Asrama Putri'})`,
    }));
    setIsStudentPickerOpen(false);
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Strict guard against multiple rapid clicks / double submit
    if (isSubmittingRef.current || isSaving) {
      setFormError('Keterangan: Rencana berobat sudah diinput! Data sedang diproses, tidak dapat menekan dua kali.');
      showToast('Keterangan: Rencana berobat sudah diinput.');
      return;
    }

    if (!formData.studentName.trim()) {
      setFormError('Nama siswa/anak asuh wajib diisi.');
      return;
    }
    if (!formData.complaint.trim()) {
      setFormError('Keluhan / alasan berobat atau kontrol wajib diisi.');
      return;
    }
    if (!formData.date) {
      setFormError('Tanggal rencana pelaksanaan wajib dipilih.');
      return;
    }

    // 2. Check if identical plan was recently submitted or already exists in schedule
    const fingerprint = `${formData.studentName.trim().toLowerCase()}_${formData.date}_${formData.facility}_${formData.complaint.trim().toLowerCase()}`;
    const nowTimestamp = Date.now();

    if (
      !editingPlan &&
      lastSubmittedFingerprintRef.current &&
      lastSubmittedFingerprintRef.current.fingerprint === fingerprint &&
      nowTimestamp - lastSubmittedFingerprintRef.current.timestamp < 15000
    ) {
      setFormError(`Keterangan: Rencana berobat untuk ${formData.studentName} sudah diinput sebelumnya.`);
      showToast('Keterangan: Rencana berobat sudah diinput.');
      return;
    }

    const alreadyExists = plans.some(
      (p) =>
        p.studentName.trim().toLowerCase() === formData.studentName.trim().toLowerCase() &&
        p.date === formData.date &&
        p.facility === formData.facility &&
        p.status === 'rencana' &&
        p.id !== editingPlan?.id
    );

    if (alreadyExists && !editingPlan) {
      setFormError(
        `Keterangan: Rencana berobat untuk ${formData.studentName} di ${formData.facility} pada tanggal ${formData.date} sudah diinput sebelumnya.`
      );
      showToast('Keterangan: Rencana berobat sudah diinput.');
      return;
    }

    // Lock immediately
    isSubmittingRef.current = true;
    setIsSaving(true);
    setFormError(null);

    const planToSave: StudentMedicalPlan = {
      id: editingPlan?.id || `med-plan-${Date.now()}`,
      studentName: formData.studentName.trim(),
      studentClassOrRoom: formData.studentClassOrRoom.trim() || 'Siswa Asrama',
      facility: formData.facility,
      facilityDetail: formData.facilityDetail.trim() || formData.facility,
      date: formData.date,
      time: formData.time || '08:30',
      planType: formData.planType,
      complaint: formData.complaint.trim(),
      accompanyingStaffName: formData.accompanyingStaffName.trim() || 'Wali Asuh Jaga',
      accompanyingStaffId: formData.accompanyingStaffId,
      notes: formData.notes.trim() || undefined,
      status: editingPlan?.status || 'rencana',
      actionResult: editingPlan?.actionResult,
      nextControlDate: editingPlan?.nextControlDate,
      createdAt: editingPlan?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: editingPlan?.createdBy || 'Wali Asuh',
    };

    try {
      const success = await onSavePlan(planToSave);
      if (success !== false) {
        lastSubmittedFingerprintRef.current = {
          fingerprint,
          timestamp: Date.now(),
        };
        setIsModalOpen(false);
        showToast(
          editingPlan 
            ? 'Perubahan rencana berobat berhasil disimpan!' 
            : 'Rencana berobat anak asuh berhasil ditambahkan ke kalender!'
        );
      } else {
        setFormError('Gagal menyimpan rencana. Periksa koneksi data.');
      }
    } catch (err) {
      console.error('Failed to save medical plan:', err);
      setFormError('Terjadi kesalahan saat menyimpan rencana berobat.');
    } finally {
      setIsSaving(false);
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 600);
    }
  };

  const handleDeleteClick = (plan: StudentMedicalPlan) => {
    setPlanToDelete(plan);
  };

  const handleConfirmDelete = async () => {
    if (!planToDelete) return;
    setIsDeleting(true);
    try {
      const success = await onDeletePlan(planToDelete.id);
      if (success !== false) {
        if (isModalOpen && editingPlan?.id === planToDelete.id) {
          setIsModalOpen(false);
        }
        showToast(`Rencana berobat untuk ${planToDelete.studentName} berhasil dihapus.`);
        setPlanToDelete(null);
      } else {
        showToast('Gagal menghapus rencana berobat.');
      }
    } catch (err) {
      console.error('Failed to delete medical plan:', err);
      showToast('Gagal menghapus rencana berobat.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenCompleteModal = (plan: StudentMedicalPlan) => {
    setCompleteModalPlan(plan);
    setCompleteActionResult(plan.actionResult || '');
    setShouldScheduleFollowUp(false);
    // Suggest follow-up 7 days later
    const d = new Date(plan.date);
    d.setDate(d.getDate() + 7);
    setFollowUpDate(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`);
    setFollowUpTime('08:30');
    setFollowUpNotes(`Kontrol lanjutan evaluasi pasca berobat pada ${plan.date}`);
  };

  const handleSaveComplete = async () => {
    if (!completeModalPlan) return;
    setIsSaving(true);

    const updatedCurrent: StudentMedicalPlan = {
      ...completeModalPlan,
      status: 'selesai',
      actionResult: completeActionResult.trim() || 'Selesai berobat/pemeriksaan',
      nextControlDate: shouldScheduleFollowUp && followUpDate ? followUpDate : undefined,
      updatedAt: new Date().toISOString(),
    };

    await onSavePlan(updatedCurrent);

    // If follow-up scheduled, create new plan
    if (shouldScheduleFollowUp && followUpDate) {
      const newFollowUpPlan: StudentMedicalPlan = {
        id: `med-plan-${Date.now()}`,
        studentName: completeModalPlan.studentName,
        studentClassOrRoom: completeModalPlan.studentClassOrRoom,
        facility: completeModalPlan.facility,
        facilityDetail: completeModalPlan.facilityDetail,
        date: followUpDate,
        time: followUpTime || '08:30',
        planType: 'kontrol_kembali',
        complaint: `Kontrol kembali: ${completeModalPlan.complaint} (${completeActionResult || 'Evaluasi berkala'})`,
        accompanyingStaffName: completeModalPlan.accompanyingStaffName,
        accompanyingStaffId: completeModalPlan.accompanyingStaffId,
        notes: followUpNotes.trim() || 'Bawa resep atau surat kontrol sebelumnya',
        status: 'rencana',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        createdBy: 'Jadwal Kontrol Otomatis',
      };
      await onSavePlan(newFollowUpPlan);
    }

    setIsSaving(false);
    setCompleteModalPlan(null);
    showToast(
      shouldScheduleFollowUp 
        ? 'Status berobat telah selesai & jadwal kontrol kembali telah ditambahkan ke kalender!' 
        : 'Status rujukan berobat ditandai Selesai.'
    );
  };

  const getFacilityColor = (facility: MedicalFacility) => {
    switch (facility) {
      case 'UKS':
        return {
          badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800',
          pill: 'bg-emerald-600 text-white',
          dot: 'bg-emerald-500',
          icon: <Stethoscope className="w-3.5 h-3.5" />
        };
      case 'Puskesmas':
        return {
          badge: 'bg-sky-100 text-sky-800 dark:bg-sky-950/70 dark:text-sky-300 border-sky-300 dark:border-sky-800',
          pill: 'bg-sky-600 text-white',
          dot: 'bg-sky-500',
          icon: <Building2 className="w-3.5 h-3.5" />
        };
      case 'Rumah Sakit':
        return {
          badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800',
          pill: 'bg-rose-600 text-white',
          dot: 'bg-rose-500',
          icon: <Building2 className="w-3.5 h-3.5" />
        };
      default:
        return {
          badge: 'bg-purple-100 text-purple-800 dark:bg-purple-950/70 dark:text-purple-300 border-purple-300 dark:border-purple-800',
          pill: 'bg-purple-600 text-white',
          dot: 'bg-purple-500',
          icon: <Pill className="w-3.5 h-3.5" />
        };
    }
  };

  const getPlanTypeLabel = (type: MedicalPlanType) => {
    switch (type) {
      case 'kontrol_kembali':
        return 'Kontrol Kembali';
      case 'berobat':
        return 'Berobat Pertama';
      case 'rujukan':
        return 'Rujukan Lab/Spesialis';
      case 'perawatan_rutin':
        return 'Perawatan UKS Rutin';
    }
  };

  const handleRefreshClick = async () => {
    if (!onRefreshFromServer || isRefreshingServer) return;
    setIsRefreshingServer(true);
    try {
      const res = await onRefreshFromServer();
      if (res && typeof res === 'object' && 'count' in res) {
        showToast(`✓ Database Cloud terhubung! Berhasil sinkron ${res.count} agenda berobat.`);
        if (res.plans && res.plans.length > 0) {
          const firstDate = res.plans[0].date;
          if (firstDate && /^\d{4}-\d{2}-\d{2}$/.test(firstDate)) {
            const [y, m] = firstDate.split('-').map(Number);
            setCalendarYear(y);
            setCalendarMonth(m);
            setSelectedDateFilter(null);
          }
        }
      } else {
        showToast('✓ Data rencana berobat berhasil disinkronkan langsung dengan Supabase!');
      }
    } catch (err) {
      console.warn('Manual sync failed:', err);
      showToast('Gagal menyinkronkan dengan database. Cek koneksi internet.');
    } finally {
      setTimeout(() => setIsRefreshingServer(false), 600);
    }
  };

  return (
    <div className="space-y-1.5 sm:space-y-2 pb-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-700 text-white text-xs font-semibold shadow-xl animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner - Rapat & Padat (Padding & Margin Dirapatkan) */}
      <div className="bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 text-white rounded-lg sm:rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-md sm:rounded-lg bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0 shadow-inner">
              <Pill className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h2 className="text-xs sm:text-sm font-bold tracking-tight">
                  Rencana Berobat & Kontrol Siswa
                </h2>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-white/25 text-white border border-white/30 backdrop-blur-xs">
                  UKS • Puskesmas • RS
                </span>
                {/* Supabase Sync Status Badge */}
                <span className="flex items-center gap-1 px-1.5 py-0.2 rounded text-[9px] font-bold backdrop-blur-xs border bg-emerald-950/40 text-emerald-200 border-emerald-400/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Database Cloud Terhubung</span>
                </span>
              </div>
              <p className="text-[10px] sm:text-[10.5px] text-rose-100 leading-none mt-0.5">
                Tersinkronisasi otomatis antar perangkat wali asuh &bull; Notifikasi H-1 &bull; Rujukan faskes
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-center shrink-0">
            {onRefreshFromServer && (
              <button
                type="button"
                onClick={handleRefreshClick}
                disabled={isRefreshingServer}
                title="Sinkronkan data dengan database Supabase Cloud"
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white active:scale-95 transition-all shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingServer ? 'animate-spin' : ''}`} />
                <span>{isRefreshingServer ? 'Menyinkronkan...' : 'Sinkronkan'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => handleOpenAddModal()}
              className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-bold bg-white text-rose-700 hover:bg-rose-50 active:scale-95 transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-3 h-3 text-rose-600" />
              <span>+ Catat Rencana</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              title="Cetak Rekap Rujukan Siswa"
              className="p-1 rounded-md text-white bg-white/20 hover:bg-white/30 active:scale-95 transition-all cursor-pointer"
            >
              <Printer className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards - Rapat, Padat & Ringkas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 sm:gap-1.5 mt-1.5 pt-1.5 border-t border-white/20">
          <div className="bg-white/10 backdrop-blur-xs rounded-md px-2 py-1 flex items-center justify-between">
            <div>
              <span className="text-[9px] font-medium text-rose-100 block leading-none">Hari Ini</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-sm sm:text-base font-black leading-none">{stats.todayCount}</span>
                <span className="text-[9px] text-rose-200">siswa</span>
              </div>
            </div>
            {stats.todayCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-ping" />
            )}
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-md px-2 py-1">
            <span className="text-[9px] font-medium text-rose-100 block leading-none">Besok (H-1)</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black leading-none">{stats.tomorrowCount}</span>
              <span className="text-[9px] text-rose-200">siswa</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-md px-2 py-1">
            <span className="text-[9px] font-medium text-rose-100 block leading-none">Rencana Aktif</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black leading-none">{stats.totalPlanned}</span>
              <span className="text-[9px] text-rose-200">agenda</span>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-xs rounded-md px-2 py-1">
            <span className="text-[9px] font-medium text-rose-100 block leading-none">Selesai Berobat</span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-sm sm:text-base font-black leading-none">{stats.totalCompleted}</span>
              <span className="text-[9px] text-rose-200">riwayat</span>
            </div>
          </div>
        </div>
      </div>

      {/* View Switcher & Toolbar - Slim */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        {/* Toggle Mode */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg">
          <button
            type="button"
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5 text-rose-500" />
            <span>Kalender</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-500" />
            <span>Daftar ({filteredPlans.length})</span>
          </button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Facility Filter */}
          <select
            aria-label="Filter Fasilitas Kesehatan"
            value={facilityFilter}
            onChange={(e) => setFacilityFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Faskes</option>
            <option value="UKS">UKS</option>
            <option value="Puskesmas">Puskesmas</option>
            <option value="Rumah Sakit">Rumah Sakit</option>
            <option value="Klinik">Klinik</option>
          </select>

          {/* Status Filter */}
          <select
            aria-label="Filter Status Rujukan"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-lg px-2 py-1 focus:outline-none cursor-pointer"
          >
            <option value="ALL">Semua Status</option>
            <option value="rencana">Rencana</option>
            <option value="selesai">Selesai</option>
            <option value="dibatalkan">Dibatalkan</option>
          </select>

          {/* Search Box */}
          <div className="relative min-w-[160px] sm:min-w-[190px]">
            <Search className="w-3 h-3 absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Cari siswa / keluhan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-7 pr-2 py-1 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Date Filter Active Tag */}
      {selectedDateFilter && (
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-800 dark:text-rose-300">
          <div className="flex items-center gap-1.5 font-medium">
            <CalendarIcon className="w-3 h-3 text-rose-600" />
            <span>Memfilter tanggal: <strong>{selectedDateFilter}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => setSelectedDateFilter(null)}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-100 text-[11px] font-bold hover:bg-rose-300 transition-colors cursor-pointer"
          >
            <X className="w-2.5 h-2.5" />
            <span>Hapus Filter</span>
          </button>
        </div>
      )}

      {/* Alert banner if active plans exist in another month */}
      {monthsWithPlans.length > 0 && !monthsWithPlans.some(m => m.year === calendarYear && m.month === calendarMonth) && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-2xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
              <CalendarIcon className="w-4 h-4" />
            </div>
            <div className="text-xs">
              <span className="font-bold">Ditemukan agenda berobat di bulan lain: </span>
              <span className="text-[11px] block text-amber-800 dark:text-amber-300">
                {monthsWithPlans.map(m => `${INDONESIAN_MONTH_NAMES[m.month - 1]} ${m.year} (${m.count} agenda: ${m.studentNames.join(', ')})`).join(' • ')}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {monthsWithPlans.map(m => (
              <button
                key={`jump-alert-${m.year}-${m.month}`}
                type="button"
                onClick={() => {
                  setCalendarYear(m.year);
                  setCalendarMonth(m.month);
                  setSelectedDateFilter(null);
                }}
                className="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-2xs transition-all cursor-pointer flex items-center gap-1"
              >
                <span>Buka {INDONESIAN_MONTH_NAMES[m.month - 1]} {m.year}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ===================== VIEW MODE 1: CALENDAR VIEW ===================== */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs overflow-hidden">
          {/* Calendar Header Month Navigator */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white mr-1">
                {INDONESIAN_MONTH_NAMES[calendarMonth - 1]} {calendarYear}
              </h3>
              
              {/* Quick Jump: Jadwal Shif Bulan Ini (if different) */}
              {scheduleYear && scheduleMonth && (scheduleYear !== calendarYear || scheduleMonth !== calendarMonth) && (
                <button
                  type="button"
                  onClick={() => {
                    setCalendarYear(scheduleYear);
                    setCalendarMonth(scheduleMonth);
                    setSelectedDateFilter(null);
                  }}
                  className="px-2 py-0.5 rounded text-[9.5px] font-bold bg-rose-100 dark:bg-rose-950/60 hover:bg-rose-200 dark:hover:bg-rose-900 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 transition-colors flex items-center gap-1 cursor-pointer"
                  title="Lihat bulan jadwal shif aktif"
                >
                  <CalendarDays className="w-3 h-3" />
                  <span>Jadwal Shif ({INDONESIAN_MONTH_NAMES[scheduleMonth - 1]} {scheduleYear})</span>
                </button>
              )}

              {/* Quick Jump Chips for Any Months with Plans */}
              {monthsWithPlans.map(m => {
                const isCurrent = m.year === calendarYear && m.month === calendarMonth;
                return (
                  <button
                    key={`chip-${m.year}-${m.month}`}
                    type="button"
                    onClick={() => {
                      setCalendarYear(m.year);
                      setCalendarMonth(m.month);
                      setSelectedDateFilter(null);
                    }}
                    className={`px-2 py-0.5 rounded-full text-[9.5px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      isCurrent
                        ? 'bg-rose-600 text-white shadow-2xs ring-2 ring-rose-300 dark:ring-rose-900'
                        : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                    }`}
                    title={`${m.count} agenda: ${m.studentNames.join(', ')}`}
                  >
                    <span>📅 {INDONESIAN_MONTH_NAMES[m.month - 1]} {m.year}</span>
                    <span className={`px-1 rounded-full text-[8.5px] font-black ${
                      isCurrent ? 'bg-white/30 text-white' : 'bg-rose-600 text-white'
                    }`}>
                      {m.count}
                    </span>
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => {
                  setCalendarYear(new Date().getFullYear());
                  setCalendarMonth(new Date().getMonth() + 1);
                  setSelectedDateFilter(null);
                }}
                className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Kembali ke bulan kalender masehi saat ini"
              >
                Hari Ini
              </button>
            </div>

            <div className="flex items-center gap-1 self-end sm:self-center shrink-0">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Bulan Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="p-1 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                title="Bulan Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Calendar Weekday Names */}
          <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-slate-500 dark:text-slate-400 bg-slate-100/70 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 py-1">
            <div>Sen</div>
            <div>Sel</div>
            <div>Rab</div>
            <div>Kam</div>
            <div>Jum</div>
            <div className="text-amber-600 dark:text-amber-400">Sab</div>
            <div className="text-rose-600 dark:text-rose-400">Min</div>
          </div>

          {/* Calendar Day Cells - Slim Height */}
          <div className="grid grid-cols-7 auto-rows-fr border-b border-slate-200 dark:border-slate-800 bg-slate-200 dark:bg-slate-800 gap-[1px]">
            {calendarDays.map((item, idx) => {
              if (item.dayNumber === null || !item.dateStr) {
                return (
                  <div key={`empty-${idx}`} className="bg-slate-50/50 dark:bg-slate-950/40 min-h-[56px] sm:min-h-[68px]" />
                );
              }

              const isToday = item.dateStr === todayStr;
              const isTomorrow = item.dateStr === tomorrowStr;
              const isSelected = item.dateStr === selectedDateFilter;
              const hasPlans = item.plansForDay.length > 0;

              return (
                <div
                  key={item.dateStr}
                  onClick={() => {
                    if (hasPlans) {
                      setSelectedDateFilter(selectedDateFilter === item.dateStr ? null : item.dateStr);
                    } else {
                      handleOpenAddModal(item.dateStr);
                    }
                  }}
                  className={`min-h-[56px] sm:min-h-[68px] p-1 sm:p-1.5 flex flex-col justify-between transition-all cursor-pointer select-none relative ${
                    isSelected
                      ? 'bg-rose-50 dark:bg-rose-950/40 ring-2 ring-rose-500'
                      : isToday
                      ? 'bg-amber-50/80 dark:bg-amber-950/30'
                      : 'bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/70'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] sm:text-[11px] font-bold px-1.5 py-0.2 rounded-full leading-none ${
                      isToday
                        ? 'bg-rose-600 text-white font-black'
                        : isTomorrow
                        ? 'bg-amber-500 text-white font-black'
                        : 'text-slate-800 dark:text-slate-200'
                    }`}>
                      {item.dayNumber}
                    </span>

                    {isToday && (
                      <span className="hidden sm:inline-block text-[8.5px] font-bold text-rose-600 dark:text-rose-400 leading-none">
                        Hari Ini
                      </span>
                    )}
                    {isTomorrow && (
                      <span className="hidden sm:inline-block text-[8.5px] font-bold text-amber-600 dark:text-amber-400 leading-none">
                        H-1
                      </span>
                    )}
                  </div>

                  {/* Badges for plans */}
                  <div className="mt-0.5 space-y-0.5 overflow-hidden flex-1">
                    {item.plansForDay.slice(0, 2).map((p) => {
                      const colors = getFacilityColor(p.facility);
                      return (
                        <div
                          key={p.id}
                          title={`${p.studentName} - ${p.facilityDetail || p.facility}: ${p.complaint}`}
                          className={`text-[8.5px] sm:text-[9.5px] font-semibold px-1 py-0.2 rounded truncate flex items-center gap-0.5 leading-tight ${
                            p.status === 'selesai'
                              ? 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400 line-through'
                              : colors.pill
                          }`}
                        >
                          <span className="w-1 h-1 rounded-full bg-white shrink-0" />
                          <span className="truncate">{p.studentName.split(' ')[0]}</span>
                          <span className="text-[8px] opacity-80 shrink-0">({p.facility.substring(0, 3)})</span>
                        </div>
                      );
                    })}

                    {item.plansForDay.length > 2 && (
                      <span className="text-[8.5px] font-bold text-rose-600 dark:text-rose-400 block px-0.5 leading-none">
                        +{item.plansForDay.length - 2} lagi...
                      </span>
                    )}
                  </div>

                  {/* Empty Slot Add Action */}
                  {!hasPlans && (
                    <div className="text-[8.5px] text-slate-300 dark:text-slate-600 text-right opacity-0 hover:opacity-100 transition-opacity leading-none">
                      + Tambah
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ===================== LIST VIEW OF PLANS ===================== */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
            <span>Rincian Agenda Berobat & Kontrol</span>
            <span className="text-[10px] sm:text-xs font-semibold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {filteredPlans.length} Agenda
            </span>
          </h3>

          {selectedDateFilter ? (
            <button
              type="button"
              onClick={() => setSelectedDateFilter(null)}
              className="text-[11px] text-rose-600 dark:text-rose-400 font-bold hover:underline flex items-center gap-1 cursor-pointer bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900"
              title="Klik untuk melihat semua tanggal"
            >
              <span>Filter Tanggal: {selectedDateFilter}</span>
              <X className="w-3 h-3 text-rose-500" />
            </button>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Menampilkan semua agenda
            </span>
          )}
        </div>

        {filteredPlans.length === 0 ? (
          <div className="p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center space-y-1.5 shadow-2xs">
            <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 mx-auto flex items-center justify-center">
              <Pill className="w-5 h-5" />
            </div>
            <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Tidak Ada Rencana Rujukan / Berobat
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xs mx-auto">
              {selectedDateFilter 
                ? `Tidak ada agenda pada tanggal ${selectedDateFilter}.`
                : 'Belum ada agenda berobat yang sesuai filter saat ini.'}
            </p>
            <div className="flex items-center justify-center gap-2 flex-wrap mt-2">
              {selectedDateFilter && (
                <button
                  type="button"
                  onClick={() => setSelectedDateFilter(null)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 transition-all cursor-pointer shadow-2xs"
                >
                  <X className="w-3 h-3" />
                  <span>Lihat Semua Tanggal ({plans.length} Total)</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => handleOpenAddModal(selectedDateFilter || undefined)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-600 text-white hover:bg-rose-700 transition-all cursor-pointer shadow-2xs"
              >
                <Plus className="w-3 h-3" />
                <span>+ Buat Rencana Berobat</span>
              </button>

              {onRefreshFromServer && (
                <button
                  type="button"
                  onClick={handleRefreshClick}
                  disabled={isRefreshingServer}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-all cursor-pointer shadow-2xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3 h-3 ${isRefreshingServer ? 'animate-spin' : ''}`} />
                  <span>{isRefreshingServer ? 'Menyinkronkan...' : 'Cek Jadwal dari Database'}</span>
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-2.5">
            {filteredPlans.map((plan) => {
              const colors = getFacilityColor(plan.facility);
              const isToday = plan.date === todayStr;
              const isTomorrow = plan.date === tomorrowStr;

              return (
                <div
                  key={plan.id}
                  className={`p-2.5 sm:p-3 rounded-xl bg-white dark:bg-slate-900 border transition-all shadow-2xs space-y-2 ${
                    isToday && plan.status === 'rencana'
                      ? 'border-rose-400 dark:border-rose-700 ring-1 ring-rose-400/40'
                      : isTomorrow && plan.status === 'rencana'
                      ? 'border-amber-400 dark:border-amber-700 ring-1 ring-amber-400/40'
                      : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Card Top: Student Name & Badges */}
                  <div className="flex items-start justify-between gap-1.5">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                          {plan.studentName}
                        </h4>

                        {isToday && plan.status === 'rencana' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white animate-pulse leading-none">
                            HARI INI
                          </span>
                        )}
                        {isTomorrow && plan.status === 'rencana' && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-amber-500 text-white leading-none">
                            H-1
                          </span>
                        )}
                      </div>
                      <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5">
                        {plan.studentClassOrRoom}
                      </p>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.5px] font-bold border shrink-0 ${colors.badge}`}>
                      {colors.icon}
                      <span className="max-w-[120px] truncate">{plan.facilityDetail || plan.facility}</span>
                    </span>
                  </div>

                  {/* Complaint / Diagnostic */}
                  <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-800 text-xs space-y-0.5">
                    <div>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {getPlanTypeLabel(plan.planType)}:
                      </span>{' '}
                      <span className="text-slate-800 dark:text-slate-200">{plan.complaint}</span>
                    </div>

                    {plan.notes && (
                      <p className="text-[10px] text-amber-800 dark:text-amber-300/90 italic">
                        📝 Catatan: {plan.notes}
                      </p>
                    )}

                    {plan.actionResult && (
                      <div className="pt-0.5 border-t border-slate-200 dark:border-slate-700 text-[10.5px] text-emerald-800 dark:text-emerald-300 font-medium">
                        ✓ Hasil Dokter/Tindakan: {plan.actionResult}
                      </div>
                    )}

                    {plan.nextControlDate && (
                      <div className="text-[10px] font-bold text-blue-700 dark:text-blue-300">
                        ➔ Kontrol Berikutnya: {plan.nextControlDate}
                      </div>
                    )}
                  </div>

                  {/* Schedule & Staff Info */}
                  <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                        <CalendarIcon className="w-3 h-3 text-rose-500" />
                        {plan.date} ({plan.time || '08:00'})
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-blue-500" />
                        <span className="truncate max-w-[110px]">{plan.accompanyingStaffName}</span>
                      </span>
                    </div>

                    {/* Status Badge */}
                    <div>
                      {plan.status === 'selesai' ? (
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          <CheckCircle2 className="w-2.5 h-2.5" /> Selesai
                        </span>
                      ) : plan.status === 'dibatalkan' ? (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          Dibatalkan
                        </span>
                      ) : (
                        <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                          Terjadwal
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-1 pt-0.5">
                    {plan.status === 'rencana' && (
                      <button
                        type="button"
                        onClick={() => handleOpenCompleteModal(plan)}
                        className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Selesai</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(plan)}
                      className="p-1 rounded-md text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 transition-colors"
                      title="Ubah Rencana"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteClick(plan)}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      title="Hapus Rencana"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===================== MODAL 1: ADD / EDIT PLAN ===================== */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Modal Header */}
            <div className="px-3.5 py-2.5 bg-gradient-to-r from-rose-50 to-amber-50 dark:from-rose-950/40 dark:to-slate-900 border-b border-rose-200/60 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                  <Pill className="w-3.5 h-3.5" />
                </div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  {editingPlan ? 'Edit Rencana Berobat' : 'Rencana Berobat / Kontrol Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitForm} className="p-3.5 overflow-y-auto space-y-2.5 text-xs">
              {formError && (
                <div 
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-start gap-2 animate-in fade-in duration-150 ${
                    formError.toLowerCase().includes('sudah diinput')
                      ? 'bg-amber-50 dark:bg-amber-950/70 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
                      : 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300'
                  }`}
                >
                  <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
                    formError.toLowerCase().includes('sudah diinput')
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-rose-600 dark:text-rose-400'
                  }`} />
                  <div className="leading-snug">
                    <p className="font-bold">
                      {formError.toLowerCase().includes('sudah diinput') ? 'Pemberitahuan' : 'Periksa Formulir'}
                    </p>
                    <p className="text-[11.5px] font-medium opacity-90">{formError}</p>
                  </div>
                </div>
              )}

              {/* Student Picker row */}
              <div className="space-y-0.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Nama Siswa / Anak Asuh *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsStudentPickerOpen(true)}
                    className="text-[10.5px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Cari Data Siswa</span>
                    <ArrowRight className="w-2.5 h-2.5" />
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="Contoh: Adam Julian Shano"
                  value={formData.studentName}
                  onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              {/* Class / Room */}
              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Kamar / Kelas / Jenjang
                </label>
                <input
                  type="text"
                  placeholder="Contoh: SD 1-2 (Kamar Abu Bakar)"
                  value={formData.studentClassOrRoom}
                  onChange={(e) => setFormData({ ...formData, studentClassOrRoom: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Facility & Type */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Fasilitas Tujuan
                  </label>
                  <select
                    value={formData.facility}
                    onChange={(e) => {
                      const val = e.target.value as MedicalFacility;
                      let defDetail = 'Puskesmas Semen Kediri';
                      if (val === 'UKS') defDetail = 'Ruang UKS Asrama Utama';
                      if (val === 'Rumah Sakit') defDetail = 'RSUD Gambiran Kota Kediri';
                      if (val === 'Klinik') defDetail = 'Klinik Pratama Rawat Jalan';
                      setFormData({ ...formData, facility: val, facilityDetail: defDetail });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="UKS">UKS Asrama</option>
                    <option value="Puskesmas">Puskesmas</option>
                    <option value="Rumah Sakit">Rumah Sakit</option>
                    <option value="Klinik">Klinik / Spesialis</option>
                  </select>
                </div>

                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Jenis Rencana
                  </label>
                  <select
                    value={formData.planType}
                    onChange={(e) => setFormData({ ...formData, planType: e.target.value as MedicalPlanType })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                  >
                    <option value="berobat">Berobat Pertama</option>
                    <option value="kontrol_kembali">Kontrol Kembali</option>
                    <option value="rujukan">Rujukan Lab / Poli</option>
                    <option value="perawatan_rutin">Perawatan UKS Rutin</option>
                  </select>
                </div>
              </div>

              {/* Facility Detail */}
              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Nama Faskes / Ruangan Rinci
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Puskesmas Semen / RSUD Gambiran Poli Bedah"
                  value={formData.facilityDetail}
                  onChange={(e) => setFormData({ ...formData, facilityDetail: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Tanggal Rencana *
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                    required
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="font-bold text-slate-700 dark:text-slate-300">
                    Jam Rencana
                  </label>
                  <input
                    type="time"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Complaint / Alasan */}
              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Keluhan / Alasan Berobat / Kontrol *
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Kontrol jahitan luka siku pasca jatuh, atau demam 38.5°C..."
                  value={formData.complaint}
                  onChange={(e) => setFormData({ ...formData, complaint: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                  required
                />
              </div>

              {/* Accompanying Staff */}
              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Wali Asuh Pendamping
                </label>
                <select
                  value={formData.accompanyingStaffName}
                  onChange={(e) => {
                    const staff = staffList.find(s => s.name === e.target.value);
                    setFormData({
                      ...formData,
                      accompanyingStaffName: e.target.value,
                      accompanyingStaffId: staff ? staff.id : undefined,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                >
                  {staffList.map((st) => (
                    <option key={st.id} value={st.name}>
                      {st.name} ({st.code || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Notes */}
              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Catatan Tambahan / Dokumen (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Bawa kartu BPJS, resep obat lama, surat izin"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="pt-2 flex items-center justify-between gap-1.5 border-t border-slate-200 dark:border-slate-800">
                {editingPlan ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteClick(editingPlan)}
                    className="flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/50 px-2 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    title="Hapus Rencana Ini"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Hapus</span>
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-2.5 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-3.5 py-1.5 rounded-lg font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50 text-xs disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {isSaving ? (
                      <>
                        <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                        <span>Menyimpan...</span>
                      </>
                    ) : (
                      editingPlan ? 'Simpan' : 'Tambahkan'
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL 2: COMPLETE PLAN & FOLLOW-UP ===================== */}
      {completeModalPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            <div className="px-3.5 py-2.5 bg-emerald-50 dark:bg-emerald-950/50 border-b border-emerald-200 dark:border-emerald-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tandai Selesai & Hasil Pemeriksaan
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCompleteModalPlan(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-3 sm:p-3.5 space-y-2.5 text-xs">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <p className="font-bold text-slate-900 dark:text-white">
                  {completeModalPlan.studentName}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[10.5px]">
                  {completeModalPlan.facilityDetail || completeModalPlan.facility} • {completeModalPlan.complaint}
                </p>
              </div>

              <div className="space-y-0.5">
                <label className="font-bold text-slate-700 dark:text-slate-300">
                  Hasil Tindakan Dokter / Obat yang Diberikan *
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Diberi obat paracetamol 3x1, luka dibersihkan dan perban diganti..."
                  value={completeActionResult}
                  onChange={(e) => setCompleteActionResult(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-1.5 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              {/* Follow up checkbox */}
              <div className="p-2.5 rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={shouldScheduleFollowUp}
                    onChange={(e) => setShouldScheduleFollowUp(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-bold text-blue-900 dark:text-blue-300 text-xs">
                    Jadwalkan Kontrol Kembali (Follow-up)?
                  </span>
                </label>

                {shouldScheduleFollowUp && (
                  <div className="pt-1.5 border-t border-blue-200 dark:border-blue-900 space-y-1.5 animate-in fade-in duration-150">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] block mb-0.5">
                          Tgl Kontrol Kembali
                        </label>
                        <input
                          type="date"
                          value={followUpDate}
                          onChange={(e) => setFollowUpDate(e.target.value)}
                          className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] block mb-0.5">
                          Jam
                        </label>
                        <input
                          type="time"
                          value={followUpTime}
                          onChange={(e) => setFollowUpTime(e.target.value)}
                          className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600 dark:text-slate-400 text-[10.5px] block mb-0.5">
                        Catatan Kontrol
                      </label>
                      <input
                        type="text"
                        value={followUpNotes}
                        onChange={(e) => setFollowUpNotes(e.target.value)}
                        placeholder="Bawa resep dokter atau hasil lab"
                        className="w-full px-2 py-1 rounded-md bg-white dark:bg-slate-900 border border-blue-200 dark:border-blue-800 text-slate-900 dark:text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setCompleteModalPlan(null)}
                  className="px-2.5 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={handleSaveComplete}
                  className="px-3.5 py-1.5 rounded-lg font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? 'Menyimpan...' : 'Simpan Status Selesai'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL 3: DELETE CONFIRMATION ===================== */}
      {planToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl w-full max-w-sm overflow-hidden flex flex-col animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-modal-title"
          >
            {/* Header */}
            <div className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/50 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <h3 id="delete-modal-title" className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Konfirmasi Hapus Rencana
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !isDeleting && setPlanToDelete(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-3.5 space-y-2.5 text-xs">
              <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                Apakah Anda yakin ingin menghapus jadwal rencana berobat/rujukan untuk:
              </p>

              <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1">
                <p className="font-bold text-slate-900 dark:text-white text-xs sm:text-sm">
                  {planToDelete.studentName}
                </p>
                <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                  {planToDelete.studentClassOrRoom} • {planToDelete.facilityDetail || planToDelete.facility}
                </p>
                <p className="text-slate-600 dark:text-slate-300 text-[11px] line-clamp-2">
                  <span className="font-semibold text-rose-700 dark:text-rose-400">Keluhan:</span> {planToDelete.complaint}
                </p>
                <div className="text-[10.5px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200 dark:border-slate-700/60 flex items-center gap-2">
                  <span>📅 {planToDelete.date} ({planToDelete.time || '08:00'})</span>
                  <span>•</span>
                  <span>👤 {planToDelete.accompanyingStaffName}</span>
                </div>
              </div>

              <p className="text-[11px] text-rose-600 dark:text-rose-400 font-medium">
                ⚠️ Tindakan ini akan menghapus data rencana ini dari kalender dan database.
              </p>

              {/* Actions */}
              <div className="pt-2 flex items-center justify-end gap-1.5 border-t border-slate-200 dark:border-slate-800">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setPlanToDelete(null)}
                  className="px-3 py-1.5 rounded-lg font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={handleConfirmDelete}
                  className="flex items-center gap-1 px-3.5 py-1.5 rounded-lg font-bold bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs transition-all shadow-2xs cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{isDeleting ? 'Menghapus...' : 'Ya, Hapus'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== STUDENT PICKER MODAL ===================== */}
      {isStudentPickerOpen && (
        <StudentPickerModal
          isOpen={isStudentPickerOpen}
          onClose={() => setIsStudentPickerOpen(false)}
          onSelectStudent={handleStudentSelect}
          mode="sick"
          title="Pilih Anak Asuh / Siswa yang Akan Berobat"
        />
      )}
    </div>
  );
};
