import React, { useState, useMemo } from 'react';
import { 
  ListTodo, 
  Clock, 
  Plus, 
  Trash2, 
  Edit3, 
  RotateCcw, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  ChevronUp, 
  ChevronDown, 
  Search, 
  Sparkles,
  Eye,
  ShieldCheck,
  Check,
  X
} from 'lucide-react';
import { DailyTask, ShiftCode } from '../types';
import { SHIFT_TASKS_TEMPLATE, SHIFT_DEFINITIONS } from '../data/initialSchedule';
import { soundManager } from '../utils/audio';

interface AdminChecklistConfigViewProps {
  tasks: DailyTask[];
  onSaveTasks: (updatedTasks: DailyTask[]) => Promise<void>;
  onResetToDefault: () => Promise<void>;
  onNavigateToDashboard?: () => void;
  cloudStatus?: 'connected' | 'syncing' | 'offline' | 'error';
}

const CATEGORY_OPTIONS: { value: DailyTask['category']; label: string; bg: string; text: string }[] = [
  { value: 'presensi', label: 'Presensi / Apel', bg: 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-200 dark:border-indigo-800', text: 'text-indigo-700 dark:text-indigo-300' },
  { value: 'ibadah', label: 'Ibadah & Rohani', bg: 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-200 dark:border-emerald-800', text: 'text-emerald-700 dark:text-emerald-300' },
  { value: 'makan', label: 'Makan / Prasmanan', bg: 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-300' },
  { value: 'belajar', label: 'Belajar Mandiri', bg: 'bg-blue-50 dark:bg-blue-950/60 border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-300' },
  { value: 'patroli', label: 'Patroli & Keamanan', bg: 'bg-purple-50 dark:bg-purple-950/60 border-purple-200 dark:border-purple-800', text: 'text-purple-700 dark:text-purple-300' },
  { value: 'kebersihan', label: 'Kebersihan & Sanitasi', bg: 'bg-teal-50 dark:bg-teal-950/60 border-teal-200 dark:border-teal-800', text: 'text-teal-700 dark:text-teal-300' },
  { value: 'laporan', label: 'Laporan & Handover', bg: 'bg-rose-50 dark:bg-rose-950/60 border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-300' },
];

const SHIFT_TABS: { code: ShiftCode; label: string; desc: string; hours: string; badge: string }[] = [
  { code: 'P1', label: 'P1 (Pagi 1)', desc: 'Piket Pagi Sesi 1', hours: '07:00 - 15:00', badge: 'bg-teal-600 text-white' },
  { code: 'P2', label: 'P2 (Pagi 2)', desc: 'Piket Pagi Sesi 2', hours: '08:00 - 16:00', badge: 'bg-teal-700 text-white' },
  { code: 'P3', label: 'P3 (Pagi Khusus)', desc: 'Piket Pagi Khusus (Upacara / Sabtu / Pendampingan)', hours: '07:00 - 16:00', badge: 'bg-amber-600 text-white' },
  { code: 'P4', label: 'P4 (Pagi Acara/Kunjungan)', desc: 'Bantu Kunjungan (07-15), Patroli Luar Belakang (15-20) & Pulang Setelah Makan Malam', hours: '07:00 - 20:00', badge: 'bg-cyan-700 text-white' },
  { code: 'S2A', label: 'S2A (Kantin SMP)', desc: 'Piket Sore Kantin SMP', hours: '15:00 - 23:00', badge: 'bg-purple-600 text-white' },
  { code: 'S3A', label: 'S3A (Kantin SMA)', desc: 'Piket Sore Kantin SMA', hours: '15:00 - 23:00', badge: 'bg-orange-500 text-white' },
  { code: 'S4A', label: 'S4A (Jaga Masjid)', desc: 'Piket Sore Masjid & Luar', hours: '15:00 - 23:00', badge: 'bg-emerald-600 text-white' },
  { code: 'M', label: 'M (Malam Umum)', desc: 'Piket Malam & Dini Hari', hours: '15:00 - 07:00', badge: 'bg-blue-600 text-white' },
  { code: 'M1', label: 'M1 (Malam Sesi 1)', desc: 'Piket Malam s.d 00:00 (Laki-laki)', hours: '15:00 - 00:00', badge: 'bg-indigo-600 text-white' },
  { code: 'M2', label: 'M2 (Malam Sesi 2)', desc: 'Piket Malam Subuh - 07:00 (Perempuan)', hours: '04:00 - 07:00', badge: 'bg-blue-600 text-white' },
  { code: 'M3', label: 'M3 (Malam Pendamping)', desc: 'Mendampingi full semua shif malam & SOP M2', hours: '23:00 - 07:00', badge: 'bg-fuchsia-600 text-white' },
  { code: 'P', label: 'P (Pagi Umum)', desc: 'Piket Pagi Standar', hours: '07:00 - 15:00', badge: 'bg-yellow-500 text-slate-950' },
  { code: 'S', label: 'S (Sore Umum)', desc: 'Piket Sore Standar', hours: '15:00 - 23:00', badge: 'bg-orange-400 text-slate-950' },
];

export const AdminChecklistConfigView: React.FC<AdminChecklistConfigViewProps> = ({
  tasks,
  onSaveTasks,
  onResetToDefault,
  onNavigateToDashboard,
  cloudStatus = 'connected',
}) => {
  const [localTasks, setLocalTasks] = useState<DailyTask[]>(tasks);
  const [selectedShift, setSelectedShift] = useState<ShiftCode>('P1');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // State for task currently being edited / added
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DailyTask>>({});
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // Sync with incoming prop changes if user didn't modify local tasks
  React.useEffect(() => {
    if (!hasUnsavedChanges) {
      setLocalTasks(tasks);
    }
  }, [tasks, hasUnsavedChanges]);

  // Tasks for currently selected shift
  const currentShiftTasks = useMemo(() => {
    return localTasks.filter((t) => t.shiftCode === selectedShift);
  }, [localTasks, selectedShift]);

  // Filtered tasks by search query
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return currentShiftTasks;
    const q = searchQuery.toLowerCase();
    return currentShiftTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.time.includes(q) ||
        t.category.toLowerCase().includes(q)
    );
  }, [currentShiftTasks, searchQuery]);

  // Show Toast
  const showToast = (text: string, type: 'success' | 'error' | 'info') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Start Editing a Task
  const handleStartEdit = (task: DailyTask) => {
    setIsAddingNew(false);
    setEditingTaskId(task.id);
    setEditForm({ ...task });
  };

  // Cancel Editing
  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setEditForm({});
    setIsAddingNew(false);
  };

  // Save Edit to Local State
  const handleSaveEdit = () => {
    if (!editForm.title?.trim() || !editForm.time?.trim()) {
      showToast('Jam tugas dan judul checklist wajib diisi!', 'error');
      return;
    }

    if (isAddingNew) {
      const newTask: DailyTask = {
        id: `task_${selectedShift.toLowerCase()}_${Date.now()}`,
        shiftCode: selectedShift,
        time: editForm.time.trim(),
        title: editForm.title.trim(),
        description: (editForm.description || '').trim(),
        category: editForm.category || 'patroli',
        priority: editForm.priority || 'normal',
      };
      setLocalTasks((prev) => [...prev, newTask]);
      showToast(`Tugas baru berhasil ditambahkan untuk ${selectedShift}!`, 'info');
    } else if (editingTaskId) {
      setLocalTasks((prev) =>
        prev.map((t) =>
          t.id === editingTaskId
            ? {
                ...t,
                time: editForm.time!.trim(),
                title: editForm.title!.trim(),
                description: (editForm.description || '').trim(),
                category: editForm.category || t.category,
                priority: editForm.priority || t.priority,
              }
            : t
        )
      );
      showToast('Perubahan checklist disimpan sementara. Klik "Simpan ke Server" untuk menerapkannya.', 'info');
    }

    setHasUnsavedChanges(true);
    setEditingTaskId(null);
    setEditForm({});
    setIsAddingNew(false);
    soundManager.playClick();
  };

  // Start Adding a New Task
  const handleStartAddNew = () => {
    setEditingTaskId(null);
    setIsAddingNew(true);
    // Find sensible default time based on shift
    const defaultTime = selectedShift.startsWith('P') ? '08:00' : selectedShift === 'M' ? '23:30' : '16:00';
    setEditForm({
      shiftCode: selectedShift,
      time: defaultTime,
      title: '',
      description: '',
      category: 'patroli',
      priority: 'normal',
    });
  };

  // Delete Task
  const handleDeleteTask = (taskId: string) => {
    setLocalTasks((prev) => prev.filter((t) => t.id !== taskId));
    setHasUnsavedChanges(true);
    showToast('Tugas dihapus dari daftar sementara.', 'info');
    soundManager.playClick();
  };

  // Move Task Up / Down in sequence
  const handleMoveTask = (index: number, direction: 'up' | 'down') => {
    const shiftTasksList = [...currentShiftTasks];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= shiftTasksList.length) return;

    const currentItem = shiftTasksList[index];
    shiftTasksList[index] = shiftTasksList[targetIdx];
    shiftTasksList[targetIdx] = currentItem;

    // Merge reordered shift tasks back into all tasks
    const otherTasks = localTasks.filter((t) => t.shiftCode !== selectedShift);
    setLocalTasks([...otherTasks, ...shiftTasksList]);
    setHasUnsavedChanges(true);
    soundManager.playClick();
  };

  // Save to Cloud Server
  const handleSaveToCloud = async () => {
    setIsSaving(true);
    try {
      await onSaveTasks(localTasks);
      setHasUnsavedChanges(false);
      soundManager.playChime();
      showToast('Seluruh SOP checklist berhasil disimpan dan aktif di server Cloud!', 'success');
    } catch (err) {
      console.error('Failed to save SOP tasks:', err);
      showToast('Gagal menyimpan ke server Cloud. Silakan coba lagi.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // Reset to Default SOP Template
  const handleConfirmReset = async () => {
    setShowResetConfirm(false);
    setIsSaving(true);
    try {
      await onResetToDefault();
      setLocalTasks(SHIFT_TASKS_TEMPLATE);
      setHasUnsavedChanges(false);
      soundManager.playChime();
      showToast('SOP Checklist berhasil dikembalikan ke standar awal!', 'success');
    } catch (err) {
      console.error('Failed to reset SOP tasks:', err);
      showToast('Gagal mereset ke default.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeShiftInfo = SHIFT_TABS.find((s) => s.code === selectedShift) || SHIFT_TABS[0];
  const activeShiftMeta = SHIFT_DEFINITIONS[selectedShift];

  return (
    <div className="space-y-2.5">
      {/* Toast Notification */}
      {toastMessage && (
        <div 
          role="status"
          aria-live="polite"
          className="fixed top-14 right-3 sm:right-6 z-50 animate-in fade-in slide-in-from-top-2 duration-300 pointer-events-none"
        >
          <div className={`flex items-center gap-2 px-3.5 py-2 rounded-xl shadow-xl border text-xs font-semibold backdrop-blur-md ${
            toastMessage.type === 'success'
              ? 'bg-emerald-950/90 text-emerald-200 border-emerald-700 shadow-emerald-950/40'
              : toastMessage.type === 'error'
              ? 'bg-rose-950/90 text-rose-200 border-rose-700 shadow-rose-950/40'
              : 'bg-blue-950/90 text-blue-200 border-blue-700 shadow-blue-950/40'
          }`}>
            {toastMessage.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
            {toastMessage.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />}
            {toastMessage.type === 'info' && <Sparkles className="w-4 h-4 text-blue-400 shrink-0" />}
            <span>{toastMessage.text}</span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Reset */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
              <RotateCcw className="w-5 h-5" />
              <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                Reset ke Standar SOP?
              </h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Tindakan ini akan mengembalikan seluruh kata-kata tugas, kategori, dan jam checklist untuk semua shif ke susunan template asli bawaan sistem.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs"
              >
                Ya, Reset Standar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-3 sm:p-3.5 border border-slate-200 dark:border-slate-700 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0 mt-0.5">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-tight">
                  Pengaturan SOP & Checklist Shif (Admin)
                </h2>
                {hasUnsavedChanges ? (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Ada Perubahan
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Tersinkron Server
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">
                Sesuaikan kata-kata tugas, uraian SOP, dan jam pelaksanaan checklist untuk setiap shif dinas.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              disabled={isSaving}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Kembalikan semua checklist ke format asli sistem"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span className="hidden md:inline">Reset Default</span>
            </button>

            <button
              type="button"
              onClick={handleStartAddNew}
              disabled={isSaving || isAddingNew}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Tugas</span>
            </button>

            <button
              type="button"
              onClick={handleSaveToCloud}
              disabled={isSaving || !hasUnsavedChanges}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold text-white transition-all flex items-center gap-1.5 shadow-xs cursor-pointer ${
                hasUnsavedChanges
                  ? 'bg-blue-600 hover:bg-blue-700 ring-2 ring-blue-400/40 animate-pulse'
                  : 'bg-slate-400 dark:bg-slate-700 text-slate-200 cursor-not-allowed opacity-70'
              }`}
            >
              <Save className={`w-3.5 h-3.5 ${isSaving ? 'animate-spin' : ''}`} />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan ke Server'}</span>
            </button>
          </div>
        </div>

        {/* Shift Navigation Pills */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-700/60">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {SHIFT_TABS.map((tab) => {
              const count = localTasks.filter((t) => t.shiftCode === tab.code).length;
              const isSelected = selectedShift === tab.code;
              return (
                <button
                  key={tab.code}
                  type="button"
                  onClick={() => {
                    setSelectedShift(tab.code);
                    setEditingTaskId(null);
                    setIsAddingNew(false);
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer border ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-slate-50 dark:bg-slate-900/40 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`text-[9.5px] font-black px-1.5 py-0.2 rounded ${tab.badge}`}>
                    {tab.code}
                  </span>
                  <span>{tab.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? 'bg-indigo-800/80 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Task Manager (Left 2 Col) & Live Regular Preview (Right 1 Col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left Section: Active Shift Tasks List & Editor */}
        <div className="lg:col-span-2 space-y-2.5">
          {/* Active Shift Info & Search Header */}
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${activeShiftInfo.badge}`}>
                {activeShiftInfo.code}
              </span>
              <div>
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white leading-tight">
                  {activeShiftInfo.desc} ({activeShiftInfo.hours})
                </h3>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Total {currentShiftTasks.length} butir checklist terdaftar
                </p>
              </div>
            </div>

            {/* Quick Search */}
            <div className="relative min-w-[160px] max-w-xs w-full sm:w-auto">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari kata/jam..."
                className="w-full pl-8 pr-2.5 py-1 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-800 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Form Modal / Inline Box if Adding New or Editing */}
          {(isAddingNew || editingTaskId) && (
            <div className="bg-indigo-50/70 dark:bg-indigo-950/40 rounded-xl p-3 sm:p-3.5 border-2 border-indigo-300 dark:border-indigo-700 shadow-sm space-y-2.5 animate-in fade-in">
              <div className="flex items-center justify-between pb-1.5 border-b border-indigo-200 dark:border-indigo-800">
                <div className="flex items-center gap-1.5 text-indigo-900 dark:text-indigo-200 font-bold text-xs sm:text-sm">
                  <Edit3 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {isAddingNew ? `Tambah Butir Checklist Baru [${selectedShift}]` : `Edit Butir Checklist [${selectedShift}]`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Form Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {/* Jam Tugas */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    Jam Pelaksanaan (WIB) *
                  </label>
                  <div className="relative">
                    <Clock className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={editForm.time || ''}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, time: e.target.value }))}
                      placeholder="Contoh: 06:45 atau 15:00"
                      className="w-full pl-8 pr-2 py-1.5 text-xs font-mono font-bold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* Kategori Tugas */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    Kategori Kegiatan *
                  </label>
                  <select
                    value={editForm.category || 'patroli'}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {CATEGORY_OPTIONS.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Prioritas */}
                <div>
                  <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                    Prioritas Tugas *
                  </label>
                  <select
                    value={editForm.priority || 'normal'}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, priority: e.target.value as any }))}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    <option value="krusial">Krusial (Wajib Dilaporkan)</option>
                    <option value="penting">Penting (Standard)</option>
                    <option value="normal">Normal (Rutin)</option>
                  </select>
                </div>
              </div>

              {/* Judul Tugas */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Judul Ringkas Agenda Checklist *
                </label>
                <input
                  type="text"
                  value={editForm.title || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="Contoh: Monitoring Sholat Berjamaah di Masjid Asrama"
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Uraian SOP / Deskripsi */}
              <div>
                <label className="block text-[10.5px] font-bold text-slate-700 dark:text-slate-300 mb-0.5">
                  Uraian SOP & Instruksi Pelaksanaan (Kata-kata Tugas)
                </label>
                <textarea
                  rows={2}
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Jelaskan langkah kerja, poin pengecekan, atau adab yang perlu didampingi wali asuh..."
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500 leading-relaxed"
                />
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-xs flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isAddingNew ? 'Tambahkan ke Daftar' : 'Terapkan Perubahan'}</span>
                </button>
              </div>
            </div>
          )}

          {/* List of Tasks Cards */}
          <div className="space-y-1.5">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task, idx) => {
                const isCurrentEditing = editingTaskId === task.id;
                const catInfo = CATEGORY_OPTIONS.find((c) => c.value === task.category) || CATEGORY_OPTIONS[0];
                return (
                  <div
                    key={task.id}
                    className={`bg-white dark:bg-slate-800 rounded-xl p-2.5 sm:p-3 border transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-2 shadow-2xs ${
                      isCurrentEditing
                        ? 'border-indigo-500 ring-2 ring-indigo-400/30'
                        : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {/* Left Details */}
                    <div className="flex items-start gap-2.5 flex-1 min-w-0">
                      {/* Order Controls */}
                      <div className="flex flex-col items-center gap-0.5 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handleMoveTask(idx, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Geser Naik"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          {idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleMoveTask(idx, 'down')}
                          disabled={idx === currentShiftTasks.length - 1}
                          className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Geser Turun"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-[10.5px] font-bold px-1.5 py-0.2 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {task.time} WIB
                          </span>

                          <span className={`text-[9.5px] font-bold px-1.5 py-0.2 rounded border ${catInfo.bg} ${catInfo.text}`}>
                            {catInfo.label}
                          </span>

                          {task.priority === 'krusial' && (
                            <span className="text-[9px] font-bold px-1 py-0.2 rounded bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900">
                              Wajib / Krusial
                            </span>
                          )}

                          {task.priority === 'penting' && (
                            <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-900">
                              Penting
                            </span>
                          )}
                        </div>

                        <h4 className="text-xs sm:text-[13px] font-bold text-slate-900 dark:text-white leading-tight">
                          {task.title}
                        </h4>

                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                          {task.description}
                        </p>
                      </div>
                    </div>

                    {/* Right Edit & Delete Actions */}
                    <div className="flex items-center gap-1 shrink-0 self-end sm:self-start pt-1 sm:pt-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(task)}
                        className="px-2 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 border border-slate-200 dark:border-slate-600 transition-colors flex items-center gap-1 cursor-pointer"
                        title="Ubah kata-kata dan jam checklist ini"
                      >
                        <Edit3 className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                        title="Hapus checklist ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white dark:bg-slate-800 rounded-xl p-6 text-center border border-slate-200 dark:border-slate-700 text-slate-400 text-xs">
                Belum ada butir checklist untuk shif ini, atau tidak ada yang cocok dengan pencarian.
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={handleStartAddNew}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 cursor-pointer"
                  >
                    + Buat Butir Checklist Pertama
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Section: Live Regular View Preview */}
        <div className="space-y-2.5">
          <div className="bg-white dark:bg-slate-800 rounded-xl p-3 border border-slate-200 dark:border-slate-700 shadow-xs space-y-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h3 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                  Pratinjau Layar Petugas
                </h3>
              </div>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-200 font-bold">
                Layar Wali Asuh
              </span>
            </div>

            <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-snug">
              Inilah tampilan yang akan dilihat oleh Wali Asuh yang bertugas pada shif <strong>{selectedShift}</strong> di HP atau PC mereka:
            </p>

            {/* Simulated Live Checklist Box */}
            <div className="rounded-xl border border-slate-300 dark:border-slate-600 p-2.5 bg-slate-50/70 dark:bg-slate-900/50 space-y-1.5 max-h-[460px] overflow-y-auto">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-800 dark:text-slate-200">
                <span>Checklist Shif ({selectedShift})</span>
                <span className="text-[10px] text-slate-500 font-normal">0 / {currentShiftTasks.length} Selesai</span>
              </div>

              {currentShiftTasks.map((task, idx) => (
                <div
                  key={task.id}
                  className="rounded-lg p-2 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xs space-y-0.5"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-400 shrink-0" />
                    <span className="font-mono text-[9.5px] font-bold px-1 py-0.1 rounded bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
                      {task.time}
                    </span>
                    <h5 className="text-[11px] font-semibold text-slate-900 dark:text-white truncate">
                      {task.title}
                    </h5>
                    {task.priority === 'krusial' && (
                      <span className="text-[8px] font-bold px-1 rounded bg-rose-100 text-rose-700 shrink-0">
                        Wajib
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 pl-5 leading-tight line-clamp-2">
                    {task.description}
                  </p>
                </div>
              ))}
            </div>

            {onNavigateToDashboard && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={onNavigateToDashboard}
                  className="w-full py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-center"
                >
                  Buka Dashboard Harian
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
