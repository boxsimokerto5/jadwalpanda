import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  X, 
  Sparkles, 
  Edit3, 
  Trash2,
  ChevronDown,
  ShieldCheck,
  MapPin,
  RotateCcw,
  User
} from 'lucide-react';
import { Staff, MorningPostCustomOption, MorningPostAssignment, QuranAssistanceLevel } from '../types';
import { 
  getLocalMorningPostOptions, 
  subscribeToMorningPostOptions, 
  saveMorningPostAssignmentToSupabase, 
  deleteMorningPostAssignment,
  getLocalMorningPostAssignments,
  DEFAULT_QURAN_ASSISTANCE_OPTIONS
} from '../utils/morningPostService';
import { soundManager } from '../utils/audio';

interface MorningPostAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  day: number;
  month: number;
  year: number;
  monthName: string;
  shiftCode: 'P1' | 'P2' | 'P3';
  userRole: 'admin' | 'staff';
  onSaved?: (assignment: MorningPostAssignment | null) => void;
  onOpenShiftSelector?: () => void;
}

export const MorningPostAssignmentModal: React.FC<MorningPostAssignmentModalProps> = ({
  isOpen,
  onClose,
  staff,
  day,
  month,
  year,
  monthName,
  shiftCode,
  userRole,
  onSaved,
  onOpenShiftSelector,
}) => {
  const [options, setOptions] = useState<MorningPostCustomOption[]>(() => getLocalMorningPostOptions());
  const [selectedPost, setSelectedPost] = useState<string>('UKS SMP');
  const [selectedQuran, setSelectedQuran] = useState<QuranAssistanceLevel | undefined>(undefined);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToMorningPostOptions((opts) => setOptions(opts));
    return () => unsub();
  }, []);

  // Load existing assignment if any
  useEffect(() => {
    if (isOpen) {
      const all = getLocalMorningPostAssignments(year, month);
      const existing = all[`${day}_${staff.id}`];
      if (existing) {
        setSelectedQuran(existing.quranAssistance);
        const found = options.find((opt) => opt.label === existing.postTitle);
        if (found) {
          setSelectedPost(existing.postTitle || options[0]?.label || 'UKS SMP');
          setIsCustomMode(false);
          setCustomText('');
        } else if (existing.postTitle) {
          setIsCustomMode(true);
          setCustomText(existing.postTitle);
          setSelectedPost('__CUSTOM__');
        } else {
          setSelectedPost(options[0]?.label || 'UKS SMP');
          setIsCustomMode(false);
          setCustomText('');
        }
      } else {
        // default based on shift
        const defaultPost = options[0]?.label || 'UKS SD';
        setSelectedPost(defaultPost);
        setSelectedQuran(undefined);
        setIsCustomMode(false);
        setCustomText('');
      }
    }
  }, [isOpen, day, staff.id, year, month, options]);

  if (!isOpen) return null;

  const handleSelectOption = (label: string) => {
    if (userRole !== 'admin') return;
    if (label === '__CUSTOM__') {
      setIsCustomMode(true);
      setSelectedPost('__CUSTOM__');
    } else {
      setIsCustomMode(false);
      setSelectedPost(label);
    }
    soundManager.playClick();
  };

  const handleSave = async () => {
    if (userRole !== 'admin') return;
    let finalTitle = isCustomMode ? customText.trim() : selectedPost;
    if (!finalTitle && !selectedQuran) {
      finalTitle = options[0]?.label || 'UKS SMP';
    }

    const assignment: MorningPostAssignment = {
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      shiftCode,
      postTitle: finalTitle || undefined,
      quranAssistance: selectedQuran,
      customDetail: isCustomMode ? customText.trim() : undefined,
      updatedBy: 'Admin',
    };

    setIsSaving(true);
    await saveMorningPostAssignmentToSupabase(assignment);
    setIsSaving(false);
    soundManager.playChime();
    if (onSaved) onSaved(assignment);
    onClose();
  };

  const handleClear = async () => {
    if (userRole !== 'admin') return;
    setIsSaving(true);
    await deleteMorningPostAssignment(year, month, day, staff.id);
    setIsSaving(false);
    soundManager.playClick();
    if (onSaved) onSaved(null);
    onClose();
  };

  const isP1 = shiftCode === 'P1';
  const isP2 = shiftCode === 'P2';
  const isP3 = shiftCode === 'P3';
  const headerGradient = isP1
    ? 'from-sky-700 to-blue-800'
    : isP2
    ? 'from-teal-700 to-emerald-800'
    : 'from-amber-600 to-amber-800';
  const timeLabel = isP1 ? '07:00-15:00' : isP2 ? '08:00-16:00' : '07:00-16:00';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl max-w-sm w-full border border-sky-300 dark:border-sky-700/70 shadow-2xl overflow-hidden flex flex-col transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${headerGradient} text-white flex items-center justify-between`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
              <MapPin className="w-4 h-4 text-sky-200" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-extrabold text-sm leading-tight">
                  Penugasan Pos Shif {shiftCode}
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-white/20 text-white border border-white/30">
                  {timeLabel}
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-none mt-0.5">
                Tanggal {day} {monthName} {year}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-white/80 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Petugas Info */}
        <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-sky-200 dark:bg-sky-800 text-sky-900 dark:text-sky-100 flex items-center justify-center font-black text-xs">
              {staff.name.charAt(0)}
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                {staff.name}
              </div>
              <div className="text-[10.5px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <span>Wali Asuh • Kode: <strong className="text-sky-700 dark:text-sky-300 font-extrabold">{shiftCode}</strong></span>
                {userRole === 'admin' && onOpenShiftSelector && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenShiftSelector();
                    }}
                    className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                    title={`Ganti kode shif ${shiftCode} ini ke shif lain (P, S, M, O, dll.)`}
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Ubah Shif</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-[10.5px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Khusus Admin</span>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-4 space-y-3">
          {userRole !== 'admin' ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Hanya Administrator yang berwenang menentukan atau mengubah penugasan pos tugas UKS / Mobile ini.</span>
            </div>
          ) : (
            <>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                    Pilih Pos Penugasan Shif {shiftCode}:
                  </label>
                  <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                    {isP3 ? 'UKS SD / SMP / SMA / Mobile' : 'UKS / Mobile'}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                  {options.map((opt) => {
                    const isSelected = !isCustomMode && selectedPost === opt.label;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(opt.label)}
                        className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-1 ring-sky-300 dark:ring-sky-400'
                            : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Building2 className={`w-3.5 h-3.5 ${isSelected ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    );
                  })}

                  {/* Option Custom */}
                  <button
                    type="button"
                    onClick={() => handleSelectOption('__CUSTOM__')}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      isCustomMode
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-1 ring-amber-300'
                        : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <Edit3 className={`w-3.5 h-3.5 ${isCustomMode ? 'text-white' : 'text-amber-600'}`} />
                      <span>Kustom (Ketik Penugasan Khusus)</span>
                    </div>
                    {isCustomMode && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                </div>
              </div>

              {/* Custom Input */}
              {isCustomMode && (
                <div className="space-y-1 pt-1 animate-in fade-in">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    Ketik Pos / Penugasan Khusus:
                  </label>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => setCustomText(e.target.value)}
                    placeholder="Misal: UKS Asrama Putra / Lab Komputer"
                    className="w-full text-xs px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    autoFocus
                  />
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    Pos ini akan otomatis tampil di baris nama, dashboard, dan pop-up tugas.
                  </p>
                </div>
              )}

              {/* Quran Assistance Section (Tugas Tambahan, Tidak Menggantikan Pos UKS/Mobile) */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase flex items-center gap-1.5">
                    <span>📖</span>
                    <span>Tugas Tambahan: Pendampingan Mengaji</span>
                  </label>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
                    (Label Tambahan)
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-500 dark:text-slate-400">
                  Pilih tugas pendampingan mengaji sebagai label tambahan (tidak menggantikan pos UKS SD/SMP/SMA/Mobile):
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {DEFAULT_QURAN_ASSISTANCE_OPTIONS.map((qOpt) => {
                    const isQSelected = selectedQuran === qOpt.label;
                    return (
                      <button
                        key={qOpt.id}
                        type="button"
                        onClick={() => {
                          setSelectedQuran(isQSelected ? undefined : qOpt.label);
                          soundManager.playClick();
                        }}
                        className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                          isQSelected
                            ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-1 ring-emerald-300'
                            : 'bg-emerald-50/60 hover:bg-emerald-100/70 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 text-emerald-950 dark:text-emerald-200 border-emerald-200 dark:border-emerald-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span>📖</span>
                          <span className="truncate">{qOpt.label}</span>
                        </div>
                        {isQSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedQuran(undefined);
                      soundManager.playClick();
                    }}
                    className={`text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      !selectedQuran
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 font-bold'
                        : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-750 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <X className="w-3 h-3 text-rose-500" />
                      <span className="truncate">Tanpa Mengaji</span>
                    </div>
                    {!selectedQuran && <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2">
          {userRole === 'admin' ? (
            <>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isSaving}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hapus penugasan kustom dan kembalikan ke default"
                >
                  <Trash2 className="w-3 h-3 text-rose-500" />
                  <span>Reset</span>
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
                  className="px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-3.5 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Terapkan Pos'}</span>
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold cursor-pointer"
            >
              Tutup
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
