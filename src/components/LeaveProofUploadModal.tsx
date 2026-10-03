import React, { useState, useRef } from 'react';
import { 
  Upload, 
  X, 
  Check, 
  Image as ImageIcon, 
  FileText, 
  AlertCircle,
  Eye,
  Trash2
} from 'lucide-react';
import { Staff, LeavePermissionRecord } from '../types';
import { soundManager } from '../utils/audio';
import { attachLeaveProof, getLeaveTypeLabel } from '../utils/leaveService';

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
  const [filePreview, setFilePreview] = useState<string | null>(record?.proofUrl || null);
  const [fileName, setFileName] = useState<string>(record?.proofFileName || '');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check mime type (JPG/PNG)
    if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.type)) {
      setErrorMsg('Format file harus berupa JPG atau PNG!');
      return;
    }

    // Limit size to max 4MB, then compress
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file maksimal 5 MB!');
      return;
    }

    setErrorMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Compress using canvas to ensure lightweight storage
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 1200;
        const MAX_HEIGHT = 1200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Quality 0.75 for JPEG
        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setFilePreview(compressedBase64);
        setIsProcessing(false);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpload = async () => {
    if (!filePreview) {
      setErrorMsg('Silakan pilih foto surat bukti terlebih dahulu!');
      return;
    }

    setIsProcessing(true);
    soundManager.playChime();

    const leaveType = record?.leaveType || 'sakit';
    await attachLeaveProof(
      year,
      month,
      day,
      staff.id,
      staff.name,
      leaveType,
      filePreview,
      fileName || `bukti_${leaveType}_${staff.name.replace(/\s+/g, '_')}.jpg`,
      staff.name
    );

    const updated: LeavePermissionRecord = {
      id: `${year}_${month}_${day}_${staff.id}`,
      staffId: staff.id,
      staffName: staff.name,
      day,
      month,
      year,
      leaveType,
      notes: record?.notes || '',
      proofUrl: filePreview,
      proofFileName: fileName,
      proofUploadedAt: new Date().toISOString(),
      proofUploadedBy: staff.name,
      createdAt: record?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setIsProcessing(false);
    onUploaded(updated);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 sm:p-5 max-w-md w-full border-2 border-emerald-500 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center font-bold text-sm shadow-md">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Unggah Bukti Izin
              </span>
              <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-tight">
                Surat {record?.leaveType === 'dinas' ? 'Tugas Dinas' : 'Dokter / Resep Sakit'}
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

        {/* Info Petugas & Kategori */}
        <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 dark:text-white">{staff.name}</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-600 text-white">
              {record ? getLeaveTypeLabel(record.leaveType) : 'Izin'}
            </span>
          </div>
          <div className="text-[11px] text-slate-600 dark:text-slate-300">
            Tanggal: <strong>{day} {monthName} {year}</strong>
          </div>
          {record?.notes && (
            <div className="text-[11px] text-slate-500 italic mt-1">
              Catatan Admin: "{record.notes}"
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Pilih Foto Dokumen (Format JPG atau PNG):
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/jpg"
            onChange={handleFileChange}
            className="hidden"
          />

          {!filePreview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-emerald-300 dark:border-emerald-700/60 hover:border-emerald-500 rounded-xl p-6 text-center cursor-pointer bg-emerald-50/30 dark:bg-emerald-950/10 transition-colors space-y-2"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 mx-auto flex items-center justify-center">
                <ImageIcon className="w-6 h-6" />
              </div>
              <div>
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 block">
                  Klik untuk Memilih Foto Dokumen
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  Surat Keterangan Dokter, Resep Obat, atau Surat Tugas (JPG / PNG)
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="relative rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-900 max-h-56 flex items-center justify-center">
                <img
                  src={filePreview}
                  alt="Bukti Izin"
                  className="max-h-56 w-auto object-contain rounded-lg shadow-inner"
                />
                <button
                  type="button"
                  onClick={() => {
                    setFilePreview(null);
                    setFileName('');
                  }}
                  className="absolute top-2 right-2 p-1 rounded-full bg-black/60 hover:bg-black/80 text-white cursor-pointer shadow-md"
                  title="Ganti Foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                <span className="truncate max-w-[200px] font-medium">{fileName || 'Foto Dokumen'}</span>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer"
                >
                  Ganti File
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-300 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-xl border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={handleSaveUpload}
            disabled={isProcessing || !filePreview}
            className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? 'Mengunggah...' : 'Simpan & Kirim Bukti'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
