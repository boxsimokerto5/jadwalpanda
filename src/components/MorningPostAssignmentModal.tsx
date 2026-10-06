import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Check, 
  X, 
  Sparkles, 
  Edit3, 
  Trash2,
  ShieldCheck,
  MapPin,
  RotateCcw,
  Plus,
  Stethoscope
} from 'lucide-react';
import { Staff, MorningPostCustomOption, MedicalGuardCustomOption, MorningPostAssignment, QuranAssistanceLevel, ShiftCode } from '../types';
import { 
  getLocalMorningPostOptions, 
  subscribeToMorningPostOptions, 
  getLocalMedicalGuardOptions,
  subscribeToMedicalGuardOptions,
  saveMedicalGuardOptions,
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
  shiftCode: ShiftCode | string;
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
  const [medicalGuardOptions, setMedicalGuardOptions] = useState<MedicalGuardCustomOption[]>(() => getLocalMedicalGuardOptions());

  const isMorningUksShift = shiftCode === 'P1' || shiftCode === 'P2' || shiftCode === 'P3' || shiftCode === 'P';
  const isMorningAnyShift = isMorningUksShift || shiftCode === 'P4' || shiftCode === 'P5';
  const isSoreShift = shiftCode === 'S' || shiftCode === 'S2A' || shiftCode === 'S3A' || shiftCode === 'S4A';
  const isMalamShift = shiftCode === 'M' || shiftCode === 'M1' || shiftCode === 'M2' || shiftCode === 'M3';

  const [selectedPost, setSelectedPost] = useState<string>('');
  const [selectedQuran, setSelectedQuran] = useState<QuranAssistanceLevel | undefined>(undefined);
  const [isCustomMode, setIsCustomMode] = useState<boolean>(false);
  const [customText, setCustomText] = useState<string>('');

  // State for Jaga Puskesmas / Jaga Rumah Sakit / Custom (Available in Pagi, Sore & Malam)
  const [selectedMedicalGuard, setSelectedMedicalGuard] = useState<string | undefined>(undefined);
  const [isCustomMedicalMode, setIsCustomMedicalMode] = useState<boolean>(false);
  const [customMedicalText, setCustomMedicalText] = useState<string>('');
  const [saveCustomMedicalToMaster, setSaveCustomMedicalToMaster] = useState<boolean>(true);

  const [isSaving, setIsSaving] = useState<boolean>(false);

  useEffect(() => {
    const unsub1 = subscribeToMorningPostOptions((opts) => setOptions(opts));
    const unsub2 = subscribeToMedicalGuardOptions((medOpts) => setMedicalGuardOptions(medOpts));
    return () => {
      unsub1();
      unsub2();
    };
  }, []);

  // Load existing assignment if any
  useEffect(() => {
    if (isOpen) {
      const all = getLocalMorningPostAssignments(year, month);
      const existing = all[`${day}_${staff.id}`];
      if (existing) {
        setSelectedQuran(existing.quranAssistance);

        // Load morning UKS post if applicable
        const found = options.find((opt) => opt.label === existing.postTitle);
        if (found) {
          setSelectedPost(existing.postTitle || '');
          setIsCustomMode(false);
          setCustomText('');
        } else if (existing.postTitle) {
          setIsCustomMode(true);
          setCustomText(existing.postTitle);
          setSelectedPost('__CUSTOM__');
        } else {
          setSelectedPost('');
          setIsCustomMode(false);
          setCustomText('');
        }

        // Load medical guard label (Jaga Puskesmas / Jaga Rumah Sakit / Custom)
        if (existing.medicalGuardLabel) {
          const foundMed = medicalGuardOptions.find((m) => m.label === existing.medicalGuardLabel);
          if (foundMed) {
            setSelectedMedicalGuard(existing.medicalGuardLabel);
            setIsCustomMedicalMode(false);
            setCustomMedicalText('');
          } else {
            setSelectedMedicalGuard('__CUSTOM_MED__');
            setIsCustomMedicalMode(true);
            setCustomMedicalText(existing.medicalGuardLabel);
          }
        } else {
          setSelectedMedicalGuard(undefined);
          setIsCustomMedicalMode(false);
          setCustomMedicalText('');
        }
      } else {
        setSelectedPost(isMorningUksShift ? (options[0]?.label || 'UKS SD') : '');
        setSelectedQuran(undefined);
        setIsCustomMode(false);
        setCustomText('');
        setSelectedMedicalGuard(undefined);
        setIsCustomMedicalMode(false);
        setCustomMedicalText('');
      }
    }
  }, [isOpen, day, staff.id, year, month, options, medicalGuardOptions, isMorningUksShift]);

  if (!isOpen) return null;

  const handleSelectOption = (label: string) => {
    if (userRole !== 'admin') return;
    if (label === '__CUSTOM__') {
      setIsCustomMode(true);
      setSelectedPost('__CUSTOM__');
    } else if (label === '__NONE__') {
      setIsCustomMode(false);
      setSelectedPost('');
    } else {
      setIsCustomMode(false);
      setSelectedPost(label);
    }
    soundManager.playClick();
  };

  const handleSelectMedicalGuard = (label: string | undefined) => {
    if (userRole !== 'admin') return;
    if (label === '__CUSTOM_MED__') {
      setIsCustomMedicalMode(true);
      setSelectedMedicalGuard('__CUSTOM_MED__');
    } else {
      setIsCustomMedicalMode(false);
      setSelectedMedicalGuard(label);
    }
    soundManager.playClick();
  };

  const handleDeleteCustomMedicalOption = async (id: string, label: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = medicalGuardOptions.filter((o) => o.id !== id);
    await saveMedicalGuardOptions(next);
    setMedicalGuardOptions(next);
    if (selectedMedicalGuard === label) {
      setSelectedMedicalGuard(undefined);
    }
    soundManager.playClick();
  };

  const handleSave = async () => {
    if (userRole !== 'admin') return;
    const finalTitle = isMorningUksShift
      ? (isCustomMode ? customText.trim() : selectedPost)
      : undefined;

    const finalMedicalGuard = isCustomMedicalMode
      ? customMedicalText.trim()
      : selectedMedicalGuard;

    setIsSaving(true);

    // If admin typed a new custom medical guard label and checked save to master list
    if (isCustomMedicalMode && finalMedicalGuard && saveCustomMedicalToMaster) {
      const exists = medicalGuardOptions.some(
        (o) => o.label.toLowerCase() === finalMedicalGuard.toLowerCase()
      );
      if (!exists) {
        const nextMedOpts: MedicalGuardCustomOption[] = [
          ...medicalGuardOptions,
          {
            id: `med_${Date.now()}`,
            label: finalMedicalGuard,
            desc: 'Label tugas kustom',
            isDefault: false,
          },
        ];
        await saveMedicalGuardOptions(nextMedOpts);
        setMedicalGuardOptions(nextMedOpts);
      }
    }

    if (!finalTitle && !selectedQuran && !finalMedicalGuard) {
      await deleteMorningPostAssignment(year, month, day, staff.id);
      setIsSaving(false);
      soundManager.playClick();
      if (onSaved) onSaved(null);
      onClose();
      return;
    }

    const assignment: MorningPostAssignment = {
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      shiftCode,
      postTitle: finalTitle || undefined,
      quranAssistance: isMorningAnyShift ? selectedQuran : undefined,
      medicalGuardLabel: finalMedicalGuard || undefined,
      customDetail: isCustomMode ? customText.trim() : undefined,
      updatedBy: 'Admin',
    };

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

  const isP1 = shiftCode === 'P1' || shiftCode === 'P';
  const isP2 = shiftCode === 'P2';
  const isP3 = shiftCode === 'P3';

  const headerGradient = isP1
    ? 'from-sky-700 to-blue-800'
    : isP2
    ? 'from-teal-700 to-emerald-800'
    : isP3
    ? 'from-amber-600 to-amber-800'
    : isSoreShift
    ? 'from-orange-600 to-rose-700'
    : isMalamShift
    ? 'from-indigo-700 to-purple-900'
    : 'from-emerald-700 to-teal-800';

  const timeLabel = isP1
    ? '07:00-15:00'
    : isP2
    ? '08:00-16:00'
    : isP3
    ? '07:00-16:00'
    : shiftCode === 'P4'
    ? '07:00-20:00'
    : shiftCode === 'P5'
    ? '07:00-15:00'
    : isSoreShift
    ? '15:00-23:00'
    : isMalamShift
    ? '15:00-07:00'
    : 'Shif Aktif';

  const shiftGroupLabel = isMorningAnyShift
    ? `Shif Pagi (${shiftCode})`
    : isSoreShift
    ? `Shif Sore (${shiftCode})`
    : isMalamShift
    ? `Shif Malam (${shiftCode})`
    : `Shif ${shiftCode}`;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full border border-sky-300 dark:border-sky-700/70 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] transition-all select-none"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${headerGradient} text-white flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 backdrop-blur-xs flex items-center justify-center shadow-inner">
              {isMorningUksShift ? (
                <MapPin className="w-4 h-4 text-sky-200" />
              ) : (
                <Stethoscope className="w-4 h-4 text-rose-200" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3 className="font-extrabold text-sm leading-tight">
                  {isMorningUksShift
                    ? `Penugasan Pos & Medis (${shiftCode})`
                    : `Penyematan Tugas ${shiftGroupLabel}`}
                </h3>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-black bg-white/20 text-white border border-white/30">
                  {timeLabel}
                </span>
              </div>
              <p className="text-[11px] text-white/80 leading-none mt-0.5">
                Tanggal {day} {monthName} {year} • Pagi, Sore & Malam
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
        <div className="p-3 bg-sky-50/50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40 flex items-center justify-between shrink-0">
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

        {/* Body Content (Scrollable) */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {userRole !== 'admin' ? (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-lg text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Hanya Administrator yang berwenang menyematkan atau mengubah penugasan pos tugas UKS, Puskesmas, maupun Rumah Sakit.</span>
            </div>
          ) : (
            <>
              {/* SECTION 1: PENYEMATAN TUGAS JAGA PUSKESMAS & JAGA RUMAH SAKIT (LINTAS SHIF PAGI, SORE, MALAM + CUSTOM) */}
              <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-800/70 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-rose-900 dark:text-rose-200 uppercase flex items-center gap-1.5">
                    <span>🏥</span>
                    <span>Penyematan Jaga Puskesmas / Rumah Sakit</span>
                  </label>
                  <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-rose-200/80 dark:bg-rose-900/70 text-rose-900 dark:text-rose-200 font-bold">
                    Pagi • Sore • Malam (Custom)
                  </span>
                </div>
                <p className="text-[10.5px] text-slate-600 dark:text-slate-300 leading-snug">
                  Sematkan label <strong>Jaga Puskesmas</strong>, <strong>Jaga Rumah Sakit</strong>, atau label kustom pada petugas ini tanpa mengubah kode shif utamanya:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {medicalGuardOptions.map((mOpt) => {
                    const isMSelected = !isCustomMedicalMode && selectedMedicalGuard === mOpt.label;
                    return (
                      <div
                        key={mOpt.id}
                        onClick={() => handleSelectMedicalGuard(isMSelected ? undefined : mOpt.label)}
                        className={`text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                          isMSelected
                            ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-300 dark:ring-rose-500'
                            : 'bg-white dark:bg-slate-800 hover:bg-rose-100/70 dark:hover:bg-rose-950/50 text-rose-950 dark:text-rose-200 border-rose-200 dark:border-rose-800/60'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate min-w-0">
                          <span>🏥</span>
                          <span className="truncate">{mOpt.label}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {!mOpt.isDefault && (
                            <button
                              type="button"
                              onClick={(e) => handleDeleteCustomMedicalOption(mOpt.id, mOpt.label, e)}
                              className={`p-0.5 rounded hover:bg-black/15 ${isMSelected ? 'text-white/90' : 'text-rose-400 hover:text-rose-600'}`}
                              title="Hapus opsi kustom ini dari daftar"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                          {isMSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </div>
                      </div>
                    );
                  })}

                  {/* Tombol Ketik Label Kustom (Jaga Puskesmas / RS / Lainnya) */}
                  <button
                    type="button"
                    onClick={() => handleSelectMedicalGuard('__CUSTOM_MED__')}
                    className={`text-left px-2.5 py-2 rounded-lg text-xs font-bold flex items-center justify-between border transition-all cursor-pointer ${
                      isCustomMedicalMode
                        ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-2 ring-amber-300'
                        : 'bg-white dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-slate-750 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700/70 border-dashed'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">+ Label Kustom Baru...</span>
                    </div>
                    {isCustomMedicalMode && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                  </button>

                  {/* Tombol Tanpa Penyematan Puskesmas/RS */}
                  <button
                    type="button"
                    onClick={() => handleSelectMedicalGuard(undefined)}
                    className={`text-left px-2.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                      !selectedMedicalGuard && !isCustomMedicalMode
                        ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 font-bold'
                        : 'bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <X className="w-3 h-3 text-rose-500 shrink-0" />
                      <span className="truncate">Tanpa Jaga Puskesmas/RS</span>
                    </div>
                    {!selectedMedicalGuard && !isCustomMedicalMode && (
                      <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />
                    )}
                  </button>
                </div>

                {/* Input Kustom Label Puskesmas / Rumah Sakit */}
                {isCustomMedicalMode && (
                  <div className="space-y-1.5 pt-1.5 animate-in fade-in">
                    <label className="block text-[11px] font-bold text-rose-900 dark:text-rose-200">
                      Ketik Nama Penyematan (Bisa Custom Bebas):
                    </label>
                    <input
                      type="text"
                      value={customMedicalText}
                      onChange={(e) => setCustomMedicalText(e.target.value)}
                      placeholder="Contoh: Jaga RSUD SLG / Jaga Puskesmas Semen / Antar Rujukan RS"
                      className="w-full text-xs px-3 py-2 rounded-lg border border-rose-300 dark:border-rose-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-rose-500"
                      autoFocus
                    />
                    <label className="flex items-center gap-1.5 text-[10.5px] text-slate-700 dark:text-slate-300 cursor-pointer pt-0.5">
                      <input
                        type="checkbox"
                        checked={saveCustomMedicalToMaster}
                        onChange={(e) => setSaveCustomMedicalToMaster(e.target.checked)}
                        className="rounded border-rose-300 text-rose-600 focus:ring-rose-500"
                      />
                      <span>Simpan juga label ini ke daftar tombol pilihan tetap</span>
                    </label>
                  </div>
                )}
              </div>

              {/* SECTION 2: POS UTAMA SHIF PAGI (UKS SD / SMP / SMA / MOBILE) - KHUSUS P1, P2, P3 */}
              {isMorningUksShift && (
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
                      Pilih Pos Utama Shif {shiftCode} (UKS / Mobile):
                    </label>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 font-medium">
                      UKS SD / SMP / SMA / Mobile
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-0.5">
                    {options.map((opt) => {
                      const isSelected = !isCustomMode && selectedPost === opt.label;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectOption(isSelected ? '__NONE__' : opt.label)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-sky-600 text-white border-sky-700 shadow-xs ring-1 ring-sky-300 dark:ring-sky-400'
                              : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-sky-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-sky-600 dark:text-sky-400'}`} />
                            <span className="truncate">{opt.label}</span>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                        </button>
                      );
                    })}

                    {/* Option Custom UKS */}
                    <button
                      type="button"
                      onClick={() => handleSelectOption('__CUSTOM__')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                        isCustomMode
                          ? 'bg-amber-600 text-white border-amber-700 shadow-xs ring-1 ring-amber-300'
                          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-amber-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700/80'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Edit3 className={`w-3.5 h-3.5 shrink-0 ${isCustomMode ? 'text-white' : 'text-amber-600'}`} />
                        <span className="truncate">Kustom Pos Pagi</span>
                      </div>
                      {isCustomMode && <Check className="w-3.5 h-3.5 text-white shrink-0" />}
                    </button>

                    {/* Option Tanpa Pos UKS */}
                    <button
                      type="button"
                      onClick={() => handleSelectOption('__NONE__')}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold flex items-center justify-between border transition-all cursor-pointer ${
                        !isCustomMode && !selectedPost
                          ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white border-slate-300 dark:border-slate-600 font-bold'
                          : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <X className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span className="truncate">Tanpa Pos Khusus</span>
                      </div>
                      {!isCustomMode && !selectedPost && <Check className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300 shrink-0" />}
                    </button>
                  </div>

                  {/* Custom Input UKS */}
                  {isCustomMode && (
                    <div className="space-y-1 pt-2 animate-in fade-in">
                      <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        Ketik Pos / Penugasan Pagi Khusus:
                      </label>
                      <input
                        type="text"
                        value={customText}
                        onChange={(e) => setCustomText(e.target.value)}
                        placeholder="Misal: UKS Asrama Putra / Lab Komputer"
                        className="w-full text-xs px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-600 bg-amber-50/50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* SECTION 3: TUGAS TAMBAHAN PENDAMPINGAN MENGAJI (KHUSUS SHIF PAGI P1-P5) */}
              {isMorningAnyShift && (
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
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {userRole === 'admin' ? (
            <>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleClear}
                  disabled={isSaving}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Hapus semua penyematan pada petugas ini"
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
                    <span>Ganti Shif</span>
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
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Penyematan'}</span>
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
