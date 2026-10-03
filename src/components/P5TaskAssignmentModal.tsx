import React, { useState, useEffect } from 'react';
import { 
  GraduationCap, 
  Check, 
  X, 
  Sparkles, 
  Edit3, 
  Trash2,
  ChevronDown,
  RotateCcw
} from 'lucide-react';
import { Staff, P5CustomTaskOption, P5TaskAssignment } from '../types';
import { 
  getLocalP5TaskOptions, 
  subscribeToP5TaskOptions, 
  saveP5AssignmentToSupabase, 
  deleteP5Assignment,
  getLocalP5Assignments
} from '../utils/p5TaskService';
import { soundManager } from '../utils/audio';

interface P5TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  day: number;
  month: number;
  year: number;
  monthName: string;
  onSaved?: (assignment: P5TaskAssignment | null) => void;
  onOpenShiftSelector?: () => void;
}

export const P5TaskAssignmentModal: React.FC<P5TaskAssignmentModalProps> = ({
  isOpen,
  onClose,
  staff,
  day,
  month,
  year,
  monthName,
  onSaved,
  onOpenShiftSelector,
}) => {
  const [options, setOptions] = useState<P5CustomTaskOption[]>(() => getLocalP5TaskOptions());
  const [selectedTask, setSelectedTask] = useState<string>('Mendampingi Perhotelan');
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToP5TaskOptions((opts) => setOptions(opts));
    return () => unsub();
  }, []);

  // Load existing assignment if any
  useEffect(() => {
    if (isOpen) {
      const all = getLocalP5Assignments(year, month);
      const existing = all[`${day}_${staff.id}`];
      if (existing) {
        const found = options.find((opt) => opt.label === existing.taskTitle);
        if (found) {
          setSelectedTask(found.label);
          setIsCustomMode(false);
          setCustomText('');
        } else {
          setIsCustomMode(true);
          setCustomText(existing.taskTitle);
          setSelectedTask('CUSTOM');
        }
      } else {
        setSelectedTask(options[0]?.label || 'Mendampingi Perhotelan');
        setIsCustomMode(false);
        setCustomText('');
      }
    }
  }, [isOpen, staff.id, day, month, year, options]);

  if (!isOpen) return null;

  const handleSelectChange = (val: string) => {
    if (val === 'CUSTOM') {
      setIsCustomMode(true);
      setSelectedTask('CUSTOM');
    } else {
      setIsCustomMode(false);
      setSelectedTask(val);
    }
  };

  const handleSave = async () => {
    const taskTitle = isCustomMode ? customText.trim() : selectedTask;
    if (!taskTitle) {
      alert('Silakan pilih tugas atau isi tugas kustom.');
      return;
    }

    setIsSaving(true);
    const assignment: P5TaskAssignment = {
      staffId: staff.id,
      day,
      month,
      year,
      taskTitle,
    };

    await saveP5AssignmentToSupabase(assignment);
    setIsSaving(false);
    soundManager.playChime();
    if (onSaved) onSaved(assignment);
    onClose();
  };

  const handleClear = async () => {
    setIsSaving(true);
    await deleteP5Assignment(year, month, day, staff.id);
    setIsSaving(false);
    soundManager.playClick();
    if (onSaved) onSaved(null);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full border border-emerald-300 dark:border-emerald-700/70 shadow-2xl overflow-hidden flex flex-col transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white relative shadow-xs">
          <button
            onClick={onClose}
            className="absolute top-2 right-2 p-1 rounded-full bg-black/20 hover:bg-black/40 text-white/90 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 pr-6">
            <div className="w-7 h-7 rounded-lg bg-white/20 backdrop-blur-sm border border-white/25 flex items-center justify-center shrink-0">
              <GraduationCap className="w-4 h-4 text-emerald-200" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-black tracking-tight leading-tight truncate">
                Tugas Shif P5 (Keterampilan)
              </h3>
              <p className="text-[10px] text-emerald-100 font-mono">
                {staff.name} • Tgl {day} {monthName} {year}
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-3.5 space-y-3">
          {/* Info pill */}
          <div className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-950 dark:text-emerald-200 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Jam Dinas: <strong>07:00 – 15:00 WIB</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded bg-emerald-700 text-white font-bold text-[9px]">
                P5
              </span>
              {onOpenShiftSelector && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShiftSelector();
                  }}
                  className="px-1.5 py-0.5 rounded text-[9.5px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 border border-blue-200 dark:border-blue-800 flex items-center gap-1 cursor-pointer transition-colors"
                  title="Ganti kode shif P5 ini ke shif lain (P, S, M, O, dll.)"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Ubah Shif</span>
                </button>
              )}
            </div>
          </div>

          {/* Dropdown Task */}
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <span>Pilih Fokus Tugas Pendampingan:</span>
            </label>
            <select
              value={isCustomMode ? 'CUSTOM' : selectedTask}
              onChange={(e) => handleSelectChange(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer"
            >
              {options.map((opt) => (
                <option key={opt.id} value={opt.label}>
                  {opt.label}
                </option>
              ))}
              <option value="CUSTOM">✏️ Tulis Tugas Kustom...</option>
            </select>
          </div>

          {/* Custom Input field if chosen */}
          {isCustomMode && (
            <div className="space-y-1 animate-in fade-in">
              <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                Tuliskan Tugas Kustom:
              </label>
              <input
                type="text"
                value={customText}
                onChange={(e) => setCustomText(e.target.value)}
                placeholder="Contoh: Mendampingi Budidaya Anggrek..."
                className="w-full px-3 py-1.5 text-xs rounded-lg border border-emerald-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>
          )}
        </div>

        {/* Footer Buttons */}
        <div className="px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleClear}
              disabled={isSaving}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
            >
              Hapus Tugas
            </button>
            {onOpenShiftSelector && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShiftSelector();
                }}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer flex items-center gap-1"
                title="Buka pilihan semua kode shif"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Ganti Kode Shif</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Tugas'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
