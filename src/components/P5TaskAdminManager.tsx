import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Save, 
  RotateCcw, 
  AlertCircle, 
  CheckCircle2, 
  GraduationCap,
  Briefcase
} from 'lucide-react';
import { P5CustomTaskOption } from '../types';
import { 
  getLocalP5TaskOptions, 
  saveP5TaskOptions, 
  subscribeToP5TaskOptions, 
  DEFAULT_P5_TASK_OPTIONS 
} from '../utils/p5TaskService';
import { soundManager } from '../utils/audio';

interface P5TaskAdminManagerProps {
  onUpdated?: () => void;
}

export const P5TaskAdminManager: React.FC<P5TaskAdminManagerProps> = ({ onUpdated }) => {
  const [options, setOptions] = useState<P5CustomTaskOption[]>(() => getLocalP5TaskOptions());
  const [newLabel, setNewLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToP5TaskOptions((updated) => {
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
      showToast('error', 'Nama tugas tidak boleh kosong.');
      return;
    }

    if (options.some((opt) => opt.label.toLowerCase() === trimmed.toLowerCase())) {
      showToast('error', 'Tugas dengan nama ini sudah ada.');
      return;
    }

    const newOpt: P5CustomTaskOption = {
      id: `custom_${Date.now()}`,
      label: trimmed,
      isDefault: false,
    };

    const nextOptions = [...options, newOpt];
    setIsSaving(true);
    const success = await saveP5TaskOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      setNewLabel('');
      soundManager.playChime();
      showToast('success', `Tugas "${trimmed}" berhasil ditambahkan ke pilihan P5.`);
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal menyimpan ke server.');
    }
  };

  const handleStartEdit = (opt: P5CustomTaskOption) => {
    setEditingId(opt.id);
    setEditingLabel(opt.label);
  };

  const handleSaveEdit = async () => {
    const trimmed = editingLabel.trim();
    if (!trimmed) {
      showToast('error', 'Nama tugas tidak boleh kosong.');
      return;
    }

    const nextOptions = options.map((opt) => 
      opt.id === editingId ? { ...opt, label: trimmed } : opt
    );

    setIsSaving(true);
    const success = await saveP5TaskOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      setEditingId(null);
      setEditingLabel('');
      soundManager.playDigital();
      showToast('success', 'Perubahan nama tugas berhasil disimpan.');
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal memperbarui data.');
    }
  };

  const handleDelete = async (id: string, label: string) => {
    if (!window.confirm(`Yakin ingin menghapus pilihan tugas "${label}"?`)) return;

    const nextOptions = options.filter((opt) => opt.id !== id);
    setIsSaving(true);
    const success = await saveP5TaskOptions(nextOptions);
    setIsSaving(false);

    if (success) {
      setOptions(nextOptions);
      soundManager.playClick();
      showToast('info', `Pilihan tugas "${label}" telah dihapus.`);
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal menghapus data.');
    }
  };

  const handleResetDefaults = async () => {
    if (!window.confirm('Kembalikan ke 5 pilihan standar (Perhotelan, Tata Boga, Peternakan, Pertanian, Tata Rias)?')) return;

    setIsSaving(true);
    const success = await saveP5TaskOptions(DEFAULT_P5_TASK_OPTIONS);
    setIsSaving(false);

    if (success) {
      setOptions(DEFAULT_P5_TASK_OPTIONS);
      soundManager.playBell();
      showToast('success', 'Pilihan tugas P5 berhasil diatur ulang ke standar.');
      if (onUpdated) onUpdated();
    } else {
      showToast('error', 'Gagal mengatur ulang data.');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl p-3.5 sm:p-4 border border-emerald-300 dark:border-emerald-700/60 shadow-xs space-y-3">
      {/* Toast Alert */}
      {toast && (
        <div className={`p-2 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 shadow-xs transition-all ${
          toast.type === 'success' 
            ? 'bg-emerald-600 text-white' 
            : toast.type === 'error' 
            ? 'bg-rose-600 text-white' 
            : 'bg-blue-600 text-white'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            {toast.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
            <span className="truncate">{toast.text}</span>
          </div>
          <button onClick={() => setToast(null)} className="text-[10px] px-1 hover:opacity-75">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 shrink-0">
            <GraduationCap className="w-4 h-4" />
          </span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Kelola Daftar Tugas Shif P5 (Keterampilan & Vokasi)</span>
              <span className="text-[9.5px] px-1.5 py-0.2 rounded font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 uppercase tracking-wider">
                07:00 - 15:00
              </span>
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Atur pilihan penugasan yang muncul pada dropdown Shif P5 di Dasbor & Matriks Jadwal.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleResetDefaults}
          disabled={isSaving}
          className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
          title="Reset ke pilihan awal"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset Standar</span>
        </button>
      </div>

      {/* Daftar Pilihan Tugas Saat Ini */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10.5px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Pilihan Dropdown Aktif ({options.length} Tugas):
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {options.map((opt) => {
            const isEditing = editingId === opt.id;
            return (
              <div
                key={opt.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 text-xs"
              >
                {isEditing ? (
                  <div className="flex items-center gap-1.5 flex-1">
                    <input
                      type="text"
                      value={editingLabel}
                      onChange={(e) => setEditingLabel(e.target.value)}
                      className="flex-1 px-2 py-1 text-xs rounded border border-emerald-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="p-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      title="Simpan"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="p-1 rounded bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-400 cursor-pointer"
                      title="Batal"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">
                        {opt.label}
                      </span>
                      {opt.isDefault && (
                        <span className="text-[8.5px] px-1 py-0.2 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                          Bawaan
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleStartEdit(opt)}
                        className="p-1 rounded text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        title="Edit nama tugas"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(opt.id, opt.label)}
                        className="p-1 rounded text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 cursor-pointer"
                        title="Hapus pilihan"
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

      {/* Form Tambah Opsi Tugas Baru */}
      <form onSubmit={handleAddOption} className="pt-2 border-t border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="Tambah tugas baru (misal: Mendampingi Perikanan Air Tawar)..."
            className="w-full px-3 py-1.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
          />
        </div>
        <button
          type="submit"
          disabled={isSaving || !newLabel.trim()}
          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Menyimpan...' : 'Tambah Tugas P5'}</span>
        </button>
      </form>
    </div>
  );
};
