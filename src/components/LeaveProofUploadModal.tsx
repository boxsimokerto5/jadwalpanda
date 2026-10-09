import React, { useState, useEffect } from 'react';
import { 
  Link as LinkIcon, 
  X, 
  Check, 
  FileText, 
  AlertCircle,
  ExternalLink,
  Trash2,
  HeartPulse,
  Briefcase,
  HelpCircle,
  Info
} from 'lucide-react';
import { Staff, LeavePermissionRecord, LeaveType } from '../types';
import { soundManager } from '../utils/audio';
import { attachLeaveProof, getLeaveTypeLabel, normalizeDriveUrl } from '../utils/leaveService';

interface LeaveProofUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: Staff;
  day: number;
  month: number;
  year: number;
  monthName: string;
  record?: LeavePermissionRecord | null;
  onUploaded: (updatedRecord: LeavePermissionRecord) => void;
}

export const LeaveProofUploadModal: React.FC<LeaveProofUploadModalProps> = ({
  isOpen,
  onClose,
  staff,
  day,
  month,
  year,
  monthName,
  record,
  onUploaded,
}) => {
  const [driveLink, setDriveLink] = useState<string>(record?.proofUrl || '');
  const [docLabel, setDocLabel] = useState<string>(record?.proofFileName || '');
  const [leaveType, setLeaveType] = useState<LeaveType>(record?.leaveType || 'sakit');
  const [notes, setNotes] = useState<string>(record?.notes || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setDriveLink(record?.proofUrl || '');
      setDocLabel(record?.proofFileName || '');
      setLeaveType(record?.leaveType || 'sakit');
      setNotes(record?.notes || '');
      setErrorMsg(null);
    }
  }, [isOpen, record]);

  if (!isOpen) return null;

  const normalizedUrl = normalizeDriveUrl(driveLink);

  const handleSaveLink = async () => {
    const trimmed = driveLink.trim();
    if (!trimmed) {
      setErrorMsg('Silakan tempelkan (paste) link Google Drive dokumen bukti terlebih dahulu!');
      return;
    }

    const finalUrl = normalizeDriveUrl(trimmed);
    try {
      new URL(finalUrl);
    } catch {
      setErrorMsg('Format link tidak valid. Contoh: https://drive.google.com/file/d/...');
      return;
    }

    setErrorMsg(null);
    setIsProcessing(true);
    soundManager.playChime();

    const finalLabel =
      docLabel.trim() ||
      (leaveType === 'sakit'
        ? 'Surat Keterangan Sakit (Google Drive)'
        : leaveType === 'dinas'
        ? 'Surat Tugas Dinas Luar (Google Drive)'
        : 'Dokumen Bukti Izin (Google Drive)');

    await attachLeaveProof(
      year,
      month,
      day,
      staff.id,
      staff.name,
      leaveType,
      finalUrl,
      finalLabel,
      staff.name,
      notes.trim()
    );

    const updated: LeavePermissionRecord = {
      id: `${year}_${month}_${day}_${staff.id}`,
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      leaveType,
      notes: notes.trim(),
      proofUrl: finalUrl,
      proofFileName: finalLabel,
      proofUploadedAt: new Date().toISOString(),
      proofUploadedBy: staff.name,
      createdAt: record?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsProcessing(false);
    onUploaded(updated);
    onClose();
  };

  const handleRemoveLink = async () => {
    setIsProcessing(true);
    soundManager.playBell();

    await attachLeaveProof(
      year,
      month,
      day,
      staff.id,
      staff.name,
      leaveType,
      '',
      '',
      staff.name,
      notes.trim()
    );

    const updated: LeavePermissionRecord = {
      id: `${year}_${month}_${day}_${staff.id}`,
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      leaveType,
      notes: notes.trim(),
      proofUrl: undefined,
      proofFileName: undefined,
      proofUploadedAt: undefined,
      proofUploadedBy: undefined,
      createdAt: record?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsProcessing(false);
    onUploaded(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-md w-full border-2 border-emerald-500 shadow-2xl space-y-3.5 animate-in fade-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <LinkIcon className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Tautan Bukti Perizinan (Google Drive)
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                Cantumkan Link Google Drive
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info Petugas & Tanggal */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">{staff.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {getLeaveTypeLabel(leaveType)}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            Tanggal Izin: <strong>{day} {monthName} {year}</strong>
          </div>
        </div>

        {/* Pilihan Kategori Izin */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Kategori Perizinan:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => setLeaveType('sakit')}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center cursor-pointer transition-all ${
                leaveType === 'sakit'
                  ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 font-bold ring-1 ring-rose-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <HeartPulse className="w-4 h-4 text-rose-500" />
              <span className="text-[11px]">Sakit</span>
            </button>
            <button
              type="button"
              onClick={() => setLeaveType('dinas')}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center cursor-pointer transition-all ${
                leaveType === 'dinas'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold ring-1 ring-blue-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <Briefcase className="w-4 h-4 text-blue-500" />
              <span className="text-[11px]">Dinas Luar</span>
            </button>
            <button
              type="button"
              onClick={() => setLeaveType('keperluan_lain')}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center cursor-pointer transition-all ${
                leaveType === 'keperluan_lain'
                  ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 font-bold ring-1 ring-amber-500/30'
                  : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750'
              }`}
            >
              <HelpCircle className="w-4 h-4 text-amber-500" />
              <span className="text-[11px]">Keperluan Lain</span>
            </button>
          </div>
        </div>

        {/* Input Link Google Drive */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center justify-between">
            <span>Link Google Drive Surat / Bukti Izin: <span className="text-rose-500">*</span></span>
          </label>
          <div className="relative">
            <LinkIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400 absolute left-3 top-2.5" />
            <input
              type="url"
              value={driveLink}
              onChange={(e) => {
                setDriveLink(e.target.value);
                if (errorMsg) setErrorMsg(null);
              }}
              placeholder="https://drive.google.com/file/d/..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
            />
            {driveLink && (
              <button
                type="button"
                onClick={() => setDriveLink('')}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                title="Bersihkan input link"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Judul / Nama Dokumen Opsional */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Judul / Nama Dokumen:</span>
              <span className="text-[10px] font-normal text-slate-400">(opsional)</span>
            </label>
            <input
              type="text"
              value={docLabel}
              onChange={(e) => setDocLabel(e.target.value)}
              placeholder="Contoh: Surat Keterangan Dokter RSUD / Surat Tugas"
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Keterangan / Catatan Tambahan */}
          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
              <span>Keterangan / Catatan Alasan:</span>
              <span className="text-[10px] font-normal text-slate-400">(opsional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Contoh: Istirahat sakit 2 hari sesuai surat dokter..."
              className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Tombol Tes Buka Link jika sudah diisi */}
          {normalizedUrl && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/70 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="text-[11px] font-medium text-emerald-900 dark:text-emerald-200 truncate">
                  {normalizedUrl}
                </span>
              </div>
              <a
                href={normalizedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold shrink-0 shadow-2xs transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Tes Buka Link</span>
              </a>
            </div>
          )}

          {/* Panduan Akses Google Drive */}
          <div className="p-2.5 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/60 text-[11px] text-blue-900 dark:text-blue-200 flex items-start gap-2 leading-relaxed">
            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <span>
              Pastikan pengaturan berbagi (<em>Share</em>) file di Google Drive diatur ke{' '}
              <strong>"Siapa saja yang memiliki link" (Anyone with the link)</strong> agar rekan Wali Asuh lainnya dapat langsung melihat dokumen saat mengklik tautan.
            </span>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div>
            {record?.proofUrl && (
              <button
                type="button"
                onClick={handleRemoveLink}
                disabled={isProcessing}
                className="px-2.5 py-1.5 rounded-xl border border-rose-300 dark:border-rose-700 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Link</span>
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="button"
              onClick={handleSaveLink}
              disabled={isProcessing || !driveLink.trim()}
              className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>{isProcessing ? 'Menyimpan...' : 'Simpan Link Google Drive'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
