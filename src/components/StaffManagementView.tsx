import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  UserCheck,
  UserMinus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  AlertTriangle,
  Phone,
  CalendarDays,
  LayoutDashboard,
  ShieldCheck,
  X,
  Save,
  Info,
  Check,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Upload,
} from 'lucide-react';
import { Staff, MonthSchedule, ShiftCode } from '../types';
import {
  generateStaffInitials,
  suggestNextStaffId,
  suggestNextStaffCode,
  addStaffToMonthSchedule,
  removeStaffFromMonthSchedule,
  updateStaffInMonthSchedule,
  updateStaffInMasterList,
  removeStaffFromMasterList,
  saveStaffListToSupabase,
} from '../utils/staffService';
import { soundManager } from '../utils/audio';
import { INDONESIAN_MONTH_NAMES } from '../utils/scheduler';
import { saveScheduleToSupabase } from '../utils/supabaseService';
import { ImportScheduleModal } from './ImportScheduleModal';

interface StaffManagementViewProps {
  schedule: MonthSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<MonthSchedule>>;
  masterStaffList: Staff[];
  setMasterStaffList: (list: Staff[]) => void;
  selectedMonth: { year: number; month: number; monthName: string };
  onSelectMonth: (year: number, month: number) => void;
  onNavigateToMatrix: () => void;
  onNavigateToDashboard: () => void;
  selectedStaffId: number;
  setSelectedStaffId: (id: number) => void;
  onImportSchedule?: (newSchedule: MonthSchedule) => void;
}

export const StaffManagementView: React.FC<StaffManagementViewProps> = ({
  schedule,
  setSchedule,
  masterStaffList,
  setMasterStaffList,
  selectedMonth,
  onSelectMonth,
  onNavigateToMatrix,
  onNavigateToDashboard,
  selectedStaffId,
  setSelectedStaffId,
  onImportSchedule,
}) => {
  // Active view tab: 'active' (petugas bertugas di bulan ini) or 'inactive' (bank data / cuti bulan ini)
  const [activeTab, setActiveTab] = useState<'active' | 'inactive'>('active');

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterGender, setFilterGender] = useState<'ALL' | 'L' | 'P'>('ALL');
  const [filterJenjang, setFilterJenjang] = useState<string>('ALL');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [removingStaffFromMonth, setRemovingStaffFromMonth] = useState<Staff | null>(null);
  const [deletingStaffPermanent, setDeletingStaffPermanent] = useState<Staff | null>(null);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'error' } | null>(null);

  // Form states for Add / Edit
  const [formName, setFormName] = useState<string>('');
  const [formGender, setFormGender] = useState<'L' | 'P'>('L');
  const [formJenjang, setFormJenjang] = useState<string>('SMA');
  const [formPhone, setFormPhone] = useState<string>('');
  const [formCode, setFormCode] = useState<string>('');
  const [formInitials, setFormInitials] = useState<string>('');
  const [formIncludeInCurrentMonth, setFormIncludeInCurrentMonth] = useState<boolean>(true);

  const showToast = (text: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Staff currently participating in the selected month
  const currentMonthStaff = useMemo(() => {
    return schedule.staffList || [];
  }, [schedule.staffList]);

  // Staff in Master Directory who are NOT participating in the selected month (Cuti / Tugas Luar)
  const inactiveStaffForMonth = useMemo(() => {
    const activeIds = new Set(currentMonthStaff.map((s) => s.id));
    return masterStaffList.filter((s) => !activeIds.has(s.id));
  }, [masterStaffList, currentMonthStaff]);

  // Month navigation helpers
  const handlePrevMonth = () => {
    let nextM = selectedMonth.month - 1;
    let nextY = selectedMonth.year;
    if (nextM < 1) {
      nextM = 12;
      nextY -= 1;
    }
    onSelectMonth(nextY, nextM);
  };

  const handleNextMonth = () => {
    let nextM = selectedMonth.month + 1;
    let nextY = selectedMonth.year;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    onSelectMonth(nextY, nextM);
  };

  // Open Add Modal
  const handleOpenAddModal = () => {
    const nextCode = suggestNextStaffCode('L', masterStaffList);
    setFormName('');
    setFormGender('L');
    setFormJenjang('SMA');
    setFormPhone('');
    setFormCode(nextCode);
    setFormInitials('');
    setFormIncludeInCurrentMonth(true);
    setIsAddModalOpen(true);
    soundManager.playChime();
  };

  // Open Edit Modal
  const handleOpenEditModal = (staff: Staff) => {
    setEditingStaff(staff);
    setFormName(staff.name);
    setFormGender(staff.gender || (staff.code?.startsWith('P') ? 'P' : 'L'));
    setFormJenjang(staff.jenjang || 'SMA');
    setFormPhone(staff.phone || '');
    setFormCode(staff.code || '');
    setFormInitials(staff.initials || generateStaffInitials(staff.name));
    soundManager.playChime();
  };

  // Save New Staff
  const handleSaveNewStaff = async () => {
    if (!formName.trim()) {
      showToast('Nama wali asuh wajib diisi!', 'error');
      return;
    }

    const newId = suggestNextStaffId(masterStaffList);
    const finalInitials = formInitials.trim() || generateStaffInitials(formName);
    const finalCode = formCode.trim() || suggestNextStaffCode(formGender, masterStaffList);

    const newStaff: Staff = {
      id: newId,
      name: formName.trim(),
      role: 'Wali Asuh',
      gender: formGender,
      code: finalCode,
      jenjang: formJenjang,
      initials: finalInitials,
      group: formGender === 'L' ? 'Petugas Laki-laki' : 'Petugas Perempuan',
      phone: formPhone.trim(),
      status: 'active',
    };

    // Update Master Directory
    const updatedMaster = updateStaffInMasterList(masterStaffList, newStaff);
    setMasterStaffList(updatedMaster);
    await saveStaffListToSupabase(updatedMaster, 'Admin Tambah Petugas Master');

    // If checked, add to current month's schedule
    if (formIncludeInCurrentMonth) {
      const updatedSchedule = addStaffToMonthSchedule(schedule, newStaff, 'L');
      setSchedule(updatedSchedule);
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v15_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v14_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      } catch {}
      await saveScheduleToSupabase(updatedSchedule, `Admin Tambah Petugas ke ${schedule.monthName}`);
    }

    setIsAddModalOpen(false);
    soundManager.playBell();
    showToast(
      formIncludeInCurrentMonth
        ? `Wali asuh "${newStaff.name}" (${newStaff.code}) berhasil ditambahkan dan masuk ke jadwal ${selectedMonth.monthName} ${selectedMonth.year}!`
        : `Wali asuh "${newStaff.name}" berhasil ditambahkan ke Bank Data Petugas.`
    );
  };

  // Save Edit Staff
  const handleSaveEditStaff = async () => {
    if (!editingStaff) return;
    if (!formName.trim()) {
      showToast('Nama wali asuh tidak boleh kosong!', 'error');
      return;
    }

    const oldName = editingStaff.name;
    const finalInitials = formInitials.trim() || generateStaffInitials(formName);

    const updatedStaff: Staff = {
      ...editingStaff,
      name: formName.trim(),
      gender: formGender,
      code: formCode.trim() || editingStaff.code,
      jenjang: formJenjang,
      initials: finalInitials,
      group: formGender === 'L' ? 'Petugas Laki-laki' : 'Petugas Perempuan',
      phone: formPhone.trim(),
    };

    // 1. Update Master Directory
    const updatedMaster = updateStaffInMasterList(masterStaffList, updatedStaff);
    setMasterStaffList(updatedMaster);
    await saveStaffListToSupabase(updatedMaster, 'Admin Edit Petugas Master');

    // 2. Update in current month's schedule (if present)
    if (currentMonthStaff.some((s) => s.id === updatedStaff.id)) {
      const updatedSchedule = updateStaffInMonthSchedule(schedule, updatedStaff);
      setSchedule(updatedSchedule);
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v15_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v14_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      } catch {}
      await saveScheduleToSupabase(updatedSchedule, `Admin Edit Petugas di ${schedule.monthName}`);
    }

    setEditingStaff(null);
    soundManager.playBell();
    showToast(`Data wali asuh berhasil diperbarui: "${oldName}" ➔ "${updatedStaff.name}"`);
  };

  // Remove staff ONLY from current month (e.g. Eko Wahyudi in October)
  const handleConfirmRemoveFromMonth = async () => {
    if (!removingStaffFromMonth) return;

    const staffId = removingStaffFromMonth.id;
    const staffName = removingStaffFromMonth.name;

    const updatedSchedule = removeStaffFromMonthSchedule(schedule, staffId);
    setSchedule(updatedSchedule);

    try {
      localStorage.setItem(`wali_asuh_schedule_v16_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      localStorage.setItem(`wali_asuh_schedule_v15_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      localStorage.setItem(`wali_asuh_schedule_v14_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
    } catch {}
    await saveScheduleToSupabase(
      updatedSchedule,
      `Admin Keluarkan ${staffName} dari ${schedule.monthName} ${schedule.year}`
    );

    // If currently selected staff in navbar is this person, switch to first available
    if (selectedStaffId === staffId && updatedSchedule.staffList && updatedSchedule.staffList.length > 0) {
      setSelectedStaffId(updatedSchedule.staffList[0].id);
    }

    setRemovingStaffFromMonth(null);
    soundManager.playChime();
    showToast(
      `"${staffName}" telah dikeluarkan dari jadwal ${selectedMonth.monthName} ${selectedMonth.year}. Data beliau tetap aman di Bank Data dan dapat dimasukkan kembali di bulan depan.`,
      'info'
    );
  };

  // Add staff from Master Directory back into current month (e.g. Eko Wahyudi into November)
  const handleAddStaffToMonth = async (staff: Staff) => {
    const updatedSchedule = addStaffToMonthSchedule(schedule, staff, 'L');
    setSchedule(updatedSchedule);

    try {
      localStorage.setItem(`wali_asuh_schedule_v16_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      localStorage.setItem(`wali_asuh_schedule_v15_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      localStorage.setItem(`wali_asuh_schedule_v14_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
    } catch {}
    await saveScheduleToSupabase(
      updatedSchedule,
      `Admin Masukkan ${staff.name} ke ${schedule.monthName} ${schedule.year}`
    );

    soundManager.playBell();
    showToast(
      `"${staff.name}" (${staff.code}) berhasil dimasukkan ke jadwal ${selectedMonth.monthName} ${selectedMonth.year}!`
    );
  };

  // Permanently delete staff from Master Directory
  const handleConfirmDeletePermanent = async () => {
    if (!deletingStaffPermanent) return;

    const staffId = deletingStaffPermanent.id;
    const staffName = deletingStaffPermanent.name;

    // Remove from master
    const updatedMaster = removeStaffFromMasterList(masterStaffList, staffId);
    setMasterStaffList(updatedMaster);
    await saveStaffListToSupabase(updatedMaster, `Admin Hapus Permanen ${staffName}`);

    // If present in current schedule, remove also
    if (currentMonthStaff.some((s) => s.id === staffId)) {
      const updatedSchedule = removeStaffFromMonthSchedule(schedule, staffId);
      setSchedule(updatedSchedule);
      try {
        localStorage.setItem(`wali_asuh_schedule_v16_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v15_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
        localStorage.setItem(`wali_asuh_schedule_v14_${updatedSchedule.year}_${updatedSchedule.month}`, JSON.stringify(updatedSchedule));
      } catch {}
      await saveScheduleToSupabase(updatedSchedule, `Admin Hapus ${staffName}`);
    }

    setDeletingStaffPermanent(null);
    soundManager.playBell();
    showToast(`"${staffName}" telah dihapus permanen dari sistem.`, 'error');
  };

  // Filtered lists
  const displayedActiveStaff = useMemo(() => {
    return currentMonthStaff.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.jenjang && s.jenjang.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;
      if (filterGender === 'L' && s.gender !== 'L' && !s.group?.includes('Laki')) return false;
      if (filterGender === 'P' && s.gender !== 'P' && !s.group?.includes('Perempuan')) return false;
      if (filterJenjang !== 'ALL' && s.jenjang !== filterJenjang) return false;
      return true;
    });
  }, [currentMonthStaff, searchTerm, filterGender, filterJenjang]);

  const displayedInactiveStaff = useMemo(() => {
    return inactiveStaffForMonth.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.phone && s.phone.includes(searchTerm)) ||
        (s.jenjang && s.jenjang.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchSearch) return false;
      if (filterGender === 'L' && s.gender !== 'L' && !s.group?.includes('Laki')) return false;
      if (filterGender === 'P' && s.gender !== 'P' && !s.group?.includes('Perempuan')) return false;
      if (filterJenjang !== 'ALL' && s.jenjang !== filterJenjang) return false;
      return true;
    });
  }, [inactiveStaffForMonth, searchTerm, filterGender, filterJenjang]);

  // Count active duty days in current month for a given staff
  const getDutyCountInMonth = (staffId: number) => {
    let duties = 0;
    for (let d = 1; d <= schedule.totalDays; d++) {
      const shift = schedule.days[d]?.[staffId];
      if (shift && shift !== 'L' && shift !== 'O') {
        duties++;
      }
    }
    return duties;
  };

  return (
    <div className="space-y-3.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-bold text-white flex items-center gap-2 animate-in slide-in-from-bottom duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-600 shadow-rose-600/30'
              : toastMessage.type === 'info'
              ? 'bg-amber-600 shadow-amber-600/30'
              : 'bg-emerald-600 shadow-emerald-600/30'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Header Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-teal-700 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 rounded-xl backdrop-blur-xs">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black text-white leading-tight">
                Kelola Wali Asuh & Roster Per-Bulan
              </h1>
              <span className="px-2 py-0.5 bg-white/20 rounded-full text-[11px] font-bold text-amber-200">
                Admin Panel
              </span>
            </div>
            <p className="text-xs text-white/80 mt-0.5">
              Atur petugas yang bertugas khusus per bulan. Contoh: jika Pak Eko tidak bertugas di Oktober, cukup keluarkan dari Oktober; di bulan November bisa dimasukkan kembali dengan 1 klik!
            </p>
          </div>
        </div>

        {/* Quick Action Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onNavigateToMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Matriks Jadwal</span>
          </button>
          <button
            onClick={onNavigateToDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-xs transition-colors cursor-pointer"
          >
            <LayoutDashboard className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <button
            onClick={() => {
              setIsImportModalOpen(true);
              soundManager.playChime();
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
            title="Unggah CSV untuk memperbarui roster & jadwal Wali Asuh otomatis berdasarkan Nama"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV Roster</span>
          </button>
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Tambah Wali Asuh</span>
          </button>
        </div>
      </div>

      {/* Month Selector Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Bulan sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">Periode Aktif:</span>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-extrabold text-sm">
              <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span>{selectedMonth.monthName} {selectedMonth.year}</span>
            </div>
          </div>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors cursor-pointer"
            title="Bulan berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Month Quick-links */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          {[
            { y: 2026, m: 8, label: 'Agustus' },
            { y: 2026, m: 9, label: 'September' },
            { y: 2026, m: 10, label: 'Oktober' },
            { y: 2026, m: 11, label: 'November' },
            { y: 2026, m: 12, label: 'Desember' },
          ].map((item) => {
            const isSelected = selectedMonth.year === item.y && selectedMonth.month === item.m;
            return (
              <button
                key={`${item.y}-${item.m}`}
                onClick={() => onSelectMonth(item.y, item.m)}
                className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Info Pill Notice */}
      <div className="p-3 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
        <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <span className="font-bold">Sistem Roster Per-Bulan Aktif:</span> Perubahan petugas di tab ini berlaku khusus untuk jadwal bulan <strong>{selectedMonth.monthName} {selectedMonth.year}</strong>. Riwayat bulan-bulan sebelumnya (seperti September 2026) tersimpan terpisah dan aman 100%.
        </div>
      </div>

      {/* Tab Switcher: Bertugas di Bulan Ini VS Bank Data / Cuti */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-700 pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('active')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'active'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Bertugas di {selectedMonth.monthName} {selectedMonth.year}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'active' ? 'bg-white/20 text-white' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
              }`}
            >
              {currentMonthStaff.length} Petugas
            </span>
          </button>

          <button
            onClick={() => setActiveTab('inactive')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'inactive'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Bank Data / Cuti di {selectedMonth.monthName}</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                activeTab === 'inactive' ? 'bg-white/20 text-white' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
              }`}
            >
              {inactiveStaffForMonth.length} Petugas
            </span>
          </button>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Cari nama, kode (L1/P1)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-7 py-1.5 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Gender Filter */}
          <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900 p-0.5 rounded-lg text-xs">
            <button
              onClick={() => setFilterGender('ALL')}
              className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                filterGender === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterGender('L')}
              className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                filterGender === 'L'
                  ? 'bg-white dark:bg-slate-800 text-blue-700 dark:text-blue-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Ikhwan
            </button>
            <button
              onClick={() => setFilterGender('P')}
              className={`px-2 py-1 rounded-md font-semibold cursor-pointer ${
                filterGender === 'P'
                  ? 'bg-white dark:bg-slate-800 text-fuchsia-700 dark:text-fuchsia-300 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Akhwat
            </button>
          </div>

          {/* Jenjang Filter */}
          <select
            value={filterJenjang}
            onChange={(e) => setFilterJenjang(e.target.value)}
            className="text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 font-semibold text-slate-800 dark:text-slate-200 focus:outline-none"
          >
            <option value="ALL">Jenjang: Semua</option>
            <option value="SD">SD</option>
            <option value="SMP">SMP</option>
            <option value="SMA">SMA</option>
            <option value="-">Umum (-)</option>
          </select>
        </div>
      </div>

      {/* TAB CONTENT 1: PETUGAS BERTUGAS DI BULAN INI */}
      {activeTab === 'active' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Daftar Petugas Resmi di Jadwal {selectedMonth.monthName} {selectedMonth.year}
              </span>
            </div>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Total: <strong>{displayedActiveStaff.length}</strong> dari {currentMonthStaff.length} petugas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 w-16 text-center">Kode</th>
                  <th className="px-4 py-2.5 min-w-[190px]">Nama Lengkap Petugas</th>
                  <th className="px-3 py-2.5 w-16 text-center">Inisial</th>
                  <th className="px-3 py-2.5 text-center">Kategori</th>
                  <th className="px-3 py-2.5 text-center">Jenjang</th>
                  <th className="px-3 py-2.5 text-center">Dinas {selectedMonth.monthName}</th>
                  <th className="px-3 py-2.5 min-w-[130px]">No. WhatsApp</th>
                  <th className="px-4 py-2.5 text-right w-36">Aksi Roster</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedActiveStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                      <p className="font-semibold">
                        Belum ada petugas bertugas di bulan {selectedMonth.monthName} {selectedMonth.year}.
                      </p>
                      <p className="text-[11px] mt-1 text-slate-500">
                        Anda dapat memasukkan petugas dari tab "Bank Data / Cuti" atau mengklik "+ Tambah Wali Asuh".
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedActiveStaff.map((staff, idx) => {
                    const isMale = staff.gender === 'L' || staff.group?.includes('Laki');
                    const dutyCount = getDutyCountInMonth(staff.id);

                    return (
                      <tr
                        key={staff.id}
                        className="hover:bg-blue-50/40 dark:hover:bg-slate-700/40 transition-colors"
                      >
                        <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                              isMale
                                ? 'bg-sky-100 dark:bg-sky-950/70 text-sky-800 dark:text-sky-300 border border-sky-300 dark:border-sky-700'
                                : 'bg-fuchsia-100 dark:bg-fuchsia-950/70 text-fuchsia-800 dark:text-fuchsia-300 border border-fuchsia-300 dark:border-fuchsia-700'
                            }`}
                          >
                            {staff.code || (isMale ? `L${staff.id}` : `P${staff.id}`)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                          <div className="flex items-center gap-2">
                            <span>{staff.name}</span>
                            {staff.id === selectedStaffId && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border border-blue-300 dark:border-blue-700">
                                Profil Anda
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                            {staff.initials || generateStaffInitials(staff.name)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              isMale
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300'
                            }`}
                          >
                            {isMale ? 'Ikhwan' : 'Akhwat'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                            {staff.jenjang || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                              dutyCount > 0
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {dutyCount} hari
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {staff.phone ? (
                            <a
                              href={`https://wa.me/${staff.phone.replace(/[^0-9]/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-mono text-emerald-600 dark:text-emerald-400 hover:underline"
                            >
                              <Phone className="w-3 h-3" />
                              <span>{staff.phone}</span>
                            </a>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(staff)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Edit data / ganti nama wali asuh ini"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setRemovingStaffFromMonth(staff)}
                              className="flex items-center gap-1 px-2 py-1 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/60 rounded-lg border border-amber-300 dark:border-amber-800 transition-colors cursor-pointer text-[11px] font-bold"
                              title={`Keluarkan dari jadwal ${selectedMonth.monthName} ${selectedMonth.year}`}
                            >
                              <UserMinus className="w-3.5 h-3.5 text-amber-600" />
                              <span>Keluarkan</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: BANK DATA PETUGAS / CUTI BULAN INI */}
      {activeTab === 'inactive' && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/80 shadow-xs overflow-hidden">
          <div className="p-3 bg-amber-50/70 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Bank Data Petugas — Tidak Bertugas di {selectedMonth.monthName} {selectedMonth.year}
              </span>
            </div>
            <span className="text-[11px] text-amber-800 dark:text-amber-300 font-semibold">
              Klik <strong>"Masukkan ke Jadwal"</strong> untuk mengaktifkan petugas ke jadwal {selectedMonth.monthName}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 font-bold">
                <tr>
                  <th className="px-3 py-2.5 w-12 text-center">No</th>
                  <th className="px-3 py-2.5 w-16 text-center">Kode</th>
                  <th className="px-4 py-2.5 min-w-[190px]">Nama Lengkap Petugas</th>
                  <th className="px-3 py-2.5 w-16 text-center">Inisial</th>
                  <th className="px-3 py-2.5 text-center">Kategori</th>
                  <th className="px-3 py-2.5 text-center">Jenjang</th>
                  <th className="px-3 py-2.5 text-center">Status {selectedMonth.monthName}</th>
                  <th className="px-3 py-2.5 min-w-[130px]">No. WhatsApp</th>
                  <th className="px-4 py-2.5 text-right w-44">Aksi Bank Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {displayedInactiveStaff.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-400 dark:text-slate-500">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                      <p className="font-semibold text-slate-700 dark:text-slate-300">
                        Seluruh petugas di Bank Data sedang aktif bertugas di bulan {selectedMonth.monthName} {selectedMonth.year}.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedInactiveStaff.map((staff, idx) => {
                    const isMale = staff.gender === 'L' || staff.group?.includes('Laki');

                    return (
                      <tr
                        key={staff.id}
                        className="hover:bg-amber-50/40 dark:hover:bg-slate-700/40 transition-colors opacity-80 hover:opacity-100"
                      >
                        <td className="px-3 py-2.5 text-center font-mono text-slate-400">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                              isMale
                                ? 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700'
                                : 'bg-fuchsia-50 dark:bg-fuchsia-950/40 text-fuchsia-700 dark:text-fuchsia-300 border border-fuchsia-200 dark:border-fuchsia-800'
                            }`}
                          >
                            {staff.code || (isMale ? `L${staff.id}` : `P${staff.id}`)}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-bold text-slate-900 dark:text-slate-100">
                          {staff.name}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-700 font-mono text-[10.5px] font-bold text-slate-700 dark:text-slate-300">
                            {staff.initials || generateStaffInitials(staff.name)}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${
                              isMale
                                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300'
                                : 'bg-fuchsia-50 dark:bg-fuchsia-950/60 text-fuchsia-700 dark:text-fuchsia-300'
                            }`}
                          >
                            {isMale ? 'Ikhwan' : 'Akhwat'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-700/80 font-bold text-[11px] text-slate-700 dark:text-slate-300">
                            {staff.jenjang || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                            Cuti / Off {selectedMonth.monthName}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          {staff.phone ? (
                            <span className="font-mono text-slate-600 dark:text-slate-400">{staff.phone}</span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleAddStaffToMonth(staff)}
                              className="flex items-center gap-1 px-2.5 py-1 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs font-extrabold text-[11px] transition-all active:scale-95 cursor-pointer"
                              title={`Masukkan ${staff.name} ke jadwal bulan ${selectedMonth.monthName}`}
                            >
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>+ Ke Jadwal</span>
                            </button>

                            <button
                              onClick={() => handleOpenEditModal(staff)}
                              className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Edit data master"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>

                            <button
                              onClick={() => setDeletingStaffPermanent(staff)}
                              className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                              title="Hapus permanen dari Bank Data"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Safety Notice Footer Banner */}
      <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900 rounded-2xl flex items-start gap-2.5 text-xs text-blue-900 dark:text-blue-200">
        <ShieldCheck className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Keamanan Data Lintas Bulan Terjamin:</p>
          <p className="text-blue-800 dark:text-blue-300 text-[11.5px] leading-relaxed">
            Sistem memisahkan susunan nama per bulan. Jika petugas (misal Pak Eko Wahyudi) dikeluarkan dari bulan Oktober, jadwal bulan September beliau tetap tersimpan utuh dan tidak terganggu. Saat bulan November tiba, Anda cukup membuka bulan November lalu mengklik <strong>"+ Ke Jadwal"</strong> pada nama beliau di Bank Data.
          </p>
        </div>
      </div>

      {/* MODAL 1: Tambah Wali Asuh Baru */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-white" />
                <h3 className="font-bold text-sm">Tambah Wali Asuh Baru</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap Petugas <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Santi Rahmawati"
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value);
                    if (!formInitials || formInitials === generateStaffInitials(formName)) {
                      setFormInitials(generateStaffInitials(e.target.value));
                    }
                  }}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => {
                      const g = e.target.value as 'L' | 'P';
                      setFormGender(g);
                      setFormCode(suggestNextStaffCode(g, masterStaffList));
                    }}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="L">Ikhwan (Laki-laki)</option>
                    <option value="P">Akhwat (Perempuan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Petugas
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="L18 / P15"
                    className="w-full text-xs p-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jenjang Asrama
                  </label>
                  <select
                    value={formJenjang}
                    onChange={(e) => setFormJenjang(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="SMA">SMA</option>
                    <option value="SMP">SMP</option>
                    <option value="SD">SD</option>
                    <option value="-">Umum / Lainnya (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Inisial Singkat
                  </label>
                  <input
                    type="text"
                    value={formInitials}
                    onChange={(e) => setFormInitials(e.target.value.toLowerCase())}
                    placeholder="san"
                    maxLength={4}
                    className="w-full text-xs p-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nomor WhatsApp / HP (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: 0812-3456-7890"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>

              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeInMonth"
                  checked={formIncludeInCurrentMonth}
                  onChange={(e) => setFormIncludeInCurrentMonth(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <label htmlFor="includeInMonth" className="text-xs font-semibold text-emerald-900 dark:text-emerald-200 cursor-pointer select-none">
                  Langsung masukkan ke jadwal bulan <strong>{selectedMonth.monthName} {selectedMonth.year}</strong>
                </label>
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveNewStaff}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Wali Asuh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Edit Data Wali Asuh */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="px-5 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-white" />
                <div>
                  <h3 className="font-bold text-sm">Edit Data Wali Asuh</h3>
                  <p className="text-[11px] text-white/80">ID #{editingStaff.id} - {editingStaff.code}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingStaff(null)}
                className="p-1 hover:bg-white/20 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl text-xs text-blue-800 dark:text-blue-300 flex items-start gap-2">
                <Info className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Perubahan nama atau data profil di sini otomatis memperbarui tampilan di jadwal bulan {selectedMonth.monthName} dan di Bank Data sistem.
                </span>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nama Lengkap Wali Asuh <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full text-xs p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-bold text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jenis Kelamin
                  </label>
                  <select
                    value={formGender}
                    onChange={(e) => setFormGender(e.target.value as 'L' | 'P')}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="L">Ikhwan (Laki-laki)</option>
                    <option value="P">Akhwat (Perempuan)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Kode Petugas
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    className="w-full text-xs p-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Jenjang Asrama
                  </label>
                  <select
                    value={formJenjang}
                    onChange={(e) => setFormJenjang(e.target.value)}
                    className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl font-semibold text-slate-800 dark:text-slate-200"
                  >
                    <option value="SMA">SMA</option>
                    <option value="SMP">SMP</option>
                    <option value="SD">SD</option>
                    <option value="-">Umum / Lainnya (-)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                    Inisial Singkat
                  </label>
                  <input
                    type="text"
                    value={formInitials}
                    onChange={(e) => setFormInitials(e.target.value.toLowerCase())}
                    maxLength={4}
                    className="w-full text-xs p-2 font-mono bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  Nomor WhatsApp / HP
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0812-xxxx"
                  className="w-full text-xs p-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div className="px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setEditingStaff(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleSaveEditStaff}
                className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Konfirmasi Keluarkan Petugas dari Bulan Ini */}
      {removingStaffFromMonth && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-amber-600">
              <div className="p-3 bg-amber-100 dark:bg-amber-950/60 rounded-xl">
                <UserMinus className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Keluarkan dari Jadwal {selectedMonth.monthName} {selectedMonth.year}?
                </h3>
                <p className="text-xs text-slate-500">Khusus untuk bulan ini saja.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda akan mengeluarkan <strong>"{removingStaffFromMonth.name}"</strong> ({removingStaffFromMonth.code}) dari roster jadwal bulan <strong>{selectedMonth.monthName} {selectedMonth.year}</strong>.
            </p>

            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
              <strong>Data Tetap Aman:</strong> Profil beliau tetap tersimpan di Bank Data. Jadwal bulan September atau bulan lainnya sama sekali tidak akan berubah, dan beliau dapat dimasukkan kembali ke jadwal bulan depan kapan saja.
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRemovingStaffFromMonth(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmRemoveFromMonth}
                className="px-4 py-2 text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-xl shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span>Ya, Keluarkan dari {selectedMonth.monthName}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Konfirmasi Hapus Permanen dari Master Directory */}
      {deletingStaffPermanent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-100 dark:bg-rose-950/60 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Hapus Permanen dari Bank Data?
                </h3>
                <p className="text-xs text-slate-500">Tindakan ini menghapus data petugas sepenuhnya.</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Anda akan menghapus data <strong>"{deletingStaffPermanent.name}"</strong> ({deletingStaffPermanent.code}) secara permanen dari Bank Data sistem.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setDeletingStaffPermanent(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmDeletePermanent}
                className="px-4 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-md cursor-pointer"
              >
                Hapus Permanen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: Import CSV Jadwal & Roster Wali Asuh */}
      <ImportScheduleModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        staffList={currentMonthStaff}
        masterStaffList={masterStaffList}
        selectedMonth={selectedMonth}
        onApplySchedule={(newSched) => {
          if (onImportSchedule) {
            onImportSchedule(newSched);
          } else {
            setSchedule(newSched);
          }
          showToast(
            `Roster & Jadwal ${newSched.monthName} ${newSched.year} berhasil diperbarui (${newSched.staffList?.length || 0} Wali Asuh)!`
          );
        }}
      />
    </div>
  );
};
