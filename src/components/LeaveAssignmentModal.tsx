import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  X, 
  Check, 
  AlertCircle, 
  Calendar, 
  User, 
  Building2, 
  HeartPulse, 
  Briefcase, 
  HelpCircle,
  Clock,
  RotateCcw,
  Trash2
} from 'lucide-react';
import { Staff, LeaveType, LeavePermissionRecord } from '../types';
import { soundManager } from '../utils/audio';
import { 
  saveLeaveRecord, 
  deleteLeaveRecord,
  getLocalLeaveRecords, 
  getLeaveRecordId,
  getLeaveTypeLabel
} from '../utils/leaveService';

interface LeaveAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  day: number;
  month: number;
  year: number;
  monthName: string;
  userRole?: 'admin' | 'staff';
  onSaved: (record: LeavePermissionRecord | null) => void;
  onOpenShiftSelector?: () => void;
}

export const LeaveAssignmentModal: React.FC<LeaveAssignmentModalProps> = ({
  isOpen,
  onClose,
  staff,
  day,
  month,
  year,
  monthName,
  userRole = 'admin',
  onSaved,
  onOpenShiftSelector,
}) => {
  const [leaveType, setLeaveType] = useState<LeaveType>('sakit');
  const [notes, setNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [existingRecord, setExistingRecord] = useState<LeavePermissionRecord | null>(null);

  useEffect(() => {
    if (isOpen) {
      const records = getLocalLeaveRecords(year, month);
      const recordId = getLeaveRecordId(year, month, day, staff.id);
      const found = records[recordId];
      if (found) {
        setExistingRecord(found);
        setLeaveType(found.leaveType);
        setNotes(found.notes || '');
      } else {
        setExistingRecord(null);
        setLeaveType('sakit');
        setNotes('');
      }
    }
  }, [isOpen, year, month, day, staff.id]);

  if (!isOpen) return null;

  const handleSave = async () => {
    setIsSaving(true);
    soundManager.playChime();

    const recordId = getLeaveRecordId(year, month, day, staff.id);
    const newRecord: LeavePermissionRecord = {
      id: recordId,
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      leaveType,
      notes: notes.trim(),
      proofUrl: existingRecord?.proofUrl,
      proofFileName: existingRecord?.proofFileName,
      proofUploadedAt: existingRecord?.proofUploadedAt,
      proofUploadedBy: existingRecord?.proofUploadedBy,
      createdAt: existingRecord?.createdAt || new Date().toISOString(),
      createdBy: userRole === 'admin' ? 'Administrator' : 'Staff',
      updatedAt: new Date().toISOString(),
    };

    await saveLeaveRecord(newRecord);
    setIsSaving(false);
    onSaved(newRecord);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm(`Hapus status perizinan untuk ${staff.name}?`)) {
      return;
    }
    setIsSaving(true);
    soundManager.playBell();
    await deleteLeaveRecord(year, month, day, staff.id);
    setIsSaving(false);
    onSaved(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-md w-full border-2 border-rose-500 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-red-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400">
                  Formulir Perizinan Dinas (IZIN)
                </span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-600 text-white">
                  Admin
                </span>
              </div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                Keterangan Izin Wali Asuh
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Card Petugas */}
        <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                {staff.name}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-200 dark:bg-rose-900/70 text-rose-800 dark:text-rose-200">
              {staff.role}
            </span>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-rose-500" />
              <span>Tanggal {day} {monthName} {year}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-rose-500" />
                <span>Kode: <strong>IZIN</strong></span>
              </div>
              {onOpenShiftSelector && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenShiftSelector();
                  }}
                  className="px-1.5 py-0.2 rounded text-[9.5px] font-bold bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 hover:bg-blue-50 border border-blue-200 dark:border-blue-800 flex items-center gap-0.5 cursor-pointer transition-colors"
                  title="Ganti kode shif IZIN ke shif lain (P, S, M, O, dll.)"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>Ubah Shif</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Dropdown Pilihan Kategori Izin */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
            <span>Kategori Izin:</span>
            <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-1 gap-2">
            <label 
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                leaveType === 'sakit'
                  ? 'border-rose-500 bg-rose-50/70 dark:bg-rose-950/50 ring-2 ring-rose-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
              }`}
            >
              <input 
                type="radio" 
                name="leaveType" 
                value="sakit" 
                checked={leaveType === 'sakit'} 
                onChange={() => setLeaveType('sakit')}
                className="text-rose-600 focus:ring-rose-500" 
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center">
                  <HeartPulse className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Sakit</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Memerlukan surat keterangan dokter / resep (tombol upload aktif di dashboard)
                  </div>
                </div>
              </div>
            </label>

            <label 
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                leaveType === 'dinas'
                  ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/50 ring-2 ring-blue-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
              }`}
            >
              <input 
                type="radio" 
                name="leaveType" 
                value="dinas" 
                checked={leaveType === 'dinas'} 
                onChange={() => setLeaveType('dinas')}
                className="text-blue-600 focus:ring-blue-500" 
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 flex items-center justify-center">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Dinas Luar</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Penugasan kedinasan di luar asrama (tombol upload surat tugas aktif di dashboard)
                  </div>
                </div>
              </div>
            </label>

            <label 
              className={`flex items-center gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                leaveType === 'keperluan_lain'
                  ? 'border-amber-500 bg-amber-50/70 dark:bg-amber-950/50 ring-2 ring-amber-500/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 bg-white dark:bg-slate-800'
              }`}
            >
              <input 
                type="radio" 
                name="leaveType" 
                value="keperluan_lain" 
                checked={leaveType === 'keperluan_lain'} 
                onChange={() => setLeaveType('keperluan_lain')}
                className="text-amber-600 focus:ring-amber-500" 
              />
              <div className="flex items-center gap-2 flex-1">
                <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300 flex items-center justify-center">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Keperluan Lain</div>
                  <div className="text-[10px] text-slate-500 dark:text-slate-400">
                    Izin keluarga, mendesak, atau urusan penting lainnya
                  </div>
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Catatan Keterangan Ditambahi Oleh Admin */}
        <div className="space-y-1">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Keterangan Tambahan Admin:</span>
            <span className="text-[10px] text-slate-400 font-normal">(opsional)</span>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contoh: Rawat jalan di RSUD / Menghadiri rapat dinas luar kota..."
            rows={2}
            className="w-full text-xs p-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
          />
        </div>

        {/* Existing Proof status hint */}
        {existingRecord?.proofUrl && (
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 text-[11px] flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Bukti dokumen sudah diunggah oleh staf: <strong>{existingRecord.proofFileName || 'Foto Bukti'}</strong></span>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-1.5">
            {existingRecord && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isSaving}
                className="px-2.5 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 hover:bg-rose-50 hover:text-rose-600 text-slate-600 dark:text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                title="Hapus data izin dari sistem"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                <span>Hapus Izin</span>
              </button>
            )}
            {onOpenShiftSelector && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenShiftSelector();
                }}
                className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900 border border-blue-200 dark:border-blue-800 transition-all cursor-pointer flex items-center gap-1"
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
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Izin'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
