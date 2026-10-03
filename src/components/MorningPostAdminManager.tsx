import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  ShieldCheck,
  MapPin
} from 'lucide-react';
import { MorningPostCustomOption } from '../types';
import { 
  getLocalMorningPostOptions, 
  saveMorningPostOptions, 
  subscribeToMorningPostOptions, 
  DEFAULT_MORNING_POST_OPTIONS 
} from '../utils/morningPostService';
import { soundManager } from '../utils/audio';

interface MorningPostAdminManagerProps {
  onUpdated?: () => void;
}

export const MorningPostAdminManager: React.FC<MorningPostAdminManagerProps> = ({ onUpdated }) => {
  const [options, setOptions] = useState<MorningPostCustomOption[]>(() => getLocalMorningPostOptions());
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToMorningPostOptions((updated) => {
      setOptions(updated);
    });
    return () => unsubscribe();
  }, []);

  const showToast = (type: 'success' | 'error' | 'info', text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newLabel.trim();
    if (!trimmed) {
      showToast('error', 'Nama pos tugas tidak boleh kosong.');
      return;
    }

    if (options.some((opt) => opt.label.toLowerCase() === trimmed.toLowerCase())) {
      showToast('error', 'Pos tugas dengan nama ini sudah ada dalam daftar.');
      return;
    }

    const newOpt: MorningPostCustomOption = {
      id: `pos_${Date.now()}`,
      label: trimmed,
      isDefault: false,
    };

    const nextOptions = [...options, newOpt];
    setIsSaving(true);
    const success = await saveMorningPostOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      setNewLabel('');
      soundManager.playChime();
      showToast('success', `Pos tugas "${trimmed}" berhasil ditambahkan.`);
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal menyimpan data.');
    }
  };

  const handleStartEdit = (opt: MorningPostCustomOption) => {
    setEditingId(opt.id);
    setEditingLabel(opt.label);
    soundManager.playClick();
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const trimmed = editingLabel.trim();
    if (!trimmed) {
      showToast('error', 'Nama pos tugas tidak boleh kosong.');
      return;
    }

    const nextOptions = options.map((opt) =>
      opt.id === editingId ? { ...opt, label: trimmed } : opt
    );

    setIsSaving(true);
    const success = await saveMorningPostOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      setEditingId(null);
      setEditingLabel('');
      soundManager.playChime();
      showToast('success', 'Pos tugas berhasil diperbarui.');
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal memperbarui data.');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Yakin ingin menghapus pilihan pos tugas "${label}"?`)) return;

    const nextOptions = options.filter((opt) => opt.id !== id);
    setIsSaving(true);
    const success = await saveMorningPostOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      soundManager.playClick();
      showToast('info', `Pilihan pos "${label}" telah dihapus.`);
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal menghapus data.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Kembalikan ke 4 pilihan standar (UKS SD, UKS SMP, UKS SMA, Mobile / Keliling)?')) return;

    setIsSaving(true);
    const success = await saveMorningPostOptions(DEFAULT_MORNING_POST_OPTIONS);
    setIsSaving(false);

    if (success) {
      setOptions(DEFAULT_MORNING_POST_OPTIONS);
      soundManager.playChime();
      showToast('success', 'Pilihan pos berhasil dikembalikan ke standar awal.');
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal mereset data.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-3.5 sm:p-4 rounded-xl border border-sky-200 dark:border-sky-800/80 shadow-xs space-y-3">
      {/* Toast Alert */}
      {toast && (
        <div
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
              : 'bg-blue-50 text-blue-800 border border-blue-300 dark:bg-blue-950/60 dark:text-blue-300'
          }`}
        >
          <div className="flex items-center gap-1.5">
            {toast.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
            {toast.type === 'error' && <AlertCircle className="w-3.5 h-3.5 text-rose-600" />}
            <span>{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sky-100 dark:border-sky-900/50 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center font-bold">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Master Pilihan Pos Shif Pagi (P1, P2 & P3)
              </h3>
              <span className="px-1.5 py-0.2 rounded bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300 text-[9.5px] font-extrabold border border-sky-200 dark:border-sky-800">
                P1, P2 & P3
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Kelola daftar nama master pilihan pos (UKS SD, UKS SMP, UKS SMA, Mobile, dll). Untuk menetapkan petugas ke pos pada tanggal yang dipilih, gunakan panel penugasan harian di bawah ini.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          disabled={isSaving}
          className="text-[11px] px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors"
          title="Kembalikan ke daftar bawaan"
        >
          <RotateCcw className="w-3 h-3 text-slate-500" />
          <span>Reset Standar</span>
        </button>
      </div>

      {/* List Existing Options */}
      <div className="space-y-1.5">
        <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase">
          Daftar Pos Tugas Aktif ({options.length} Pilihan):
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {options.map((opt) => {
            const isEditing = editingId === opt.id;

            return (
              <div
                key={opt.id}
                className="flex items-center justify-between p-2 rounded-lg bg-sky-50/50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/40 text-xs text-slate-800 dark:text-slate-200"
              >
                {isEditing ? (
                  <div className="flex items-center gap-1 w-full">
                    <input
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="w-full text-xs px-2 py-0.5 rounded border border-sky-400 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="p-1 rounded bg-sky-600 text-white hover:bg-sky-500 cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 truncate">
                      <Building2 className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span className="font-semibold truncate">{opt.label}</span>
                      {opt.isDefault && (
                        <span className="text-[8px] px-1 py-0.2 rounded bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300 shrink-0">
                          Bawaan
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(opt)}
                        className="p-1 text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 cursor-pointer"
                        title="Edit nama pos"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(opt.id, opt.label)}
                        className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 cursor-pointer"
                        title="Hapus pos"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Option Form */}
      <form onSubmit={handleAddOption} className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap sm:flex-nowrap items-center gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Tambah pilihan pos baru (misal: UKS SMA Putra / Pos Lapangan)..."
          className="w-full sm:flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={isSaving || !newLabel.trim()}
          className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50 transition-all shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Pos Dropdown</span>
        </button>
      </form>
    </div>
  );
};
